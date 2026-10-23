const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');

// ================= KONFIGURASI BOT =================
const COOLDOWN_DAYS = 3; 
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;   
// ===================================================

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Siapkan database
const dbFile = './db_autoreply.json';
let db = {};
if (fs.existsSync(dbFile)) {
    try { db = JSON.parse(fs.readFileSync(dbFile)); } catch (e) { db = {}; }
}

function saveDB() {
    fs.writeFileSync(dbFile, JSON.stringify(db));
}

const processingUsers = new Set();

// Logika jeda auto-reply
function shouldReply(senderId) {
    if (processingUsers.has(senderId)) return false;
    const now = Date.now();
    const lastReplied = db[senderId] || 0;
    return (now - lastReplied) >= (COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}
const https = require('https');

// Fungsi Notif ke Telegram menggunakan modul https murni (Anti-Gagal)
function sendTelegramLog(pesanLog) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    
    const data = JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: pesanLog
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            console.log('[TELEGRAM RESPONSE]', responseBody);
        });
    });

    req.on('error', (error) => {
        console.error('[TELEGRAM ERROR HTTPS]', error.message);
    });

    req.write(data);
    req.end();
}

// Fungsi Cari Gambar QRIS
function findImage(baseName) {
    const exts = ['.png', '.jpg', '.jpeg'];
    for (const ext of exts) {
        if (fs.existsSync(`./${baseName}${ext}`)) return `./${baseName}${ext}`;
    }
    return null;
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Windows', 'Chrome', '11.0.0']
    });

    if (!sock.authState.creds.me && !sock.authState.creds.registered) {
        const phoneNumber = await question('\nMasukkan nomor WhatsApp Asisten (contoh: 628xxx): ');
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(`\n========================================\nPAIRING CODE LU: ${code}\n========================================\n`);
    }

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'close') {
            console.log('[SISTEM] Koneksi terputus, menyambung ulang...');
            startBot();
        } else if (update.connection === 'open') {
            console.log('\n>>> BOT FOTOCOPY ATEKA AKTIF! <<<');
            console.log(`Sistem Auto-Reply (Jeda 3 Hari) + Monitoring Telegram Berjalan.`);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (!m.messages || m.messages.length === 0) return;
            for (const msg of m.messages) {
                if (!msg.message || msg.key.fromMe) continue;

                const senderId = msg.key.remoteJid;
                if (!senderId || senderId.endsWith('@g.us') || senderId.includes('broadcast')) continue;

                const textPesan = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

                // ==============================================================
                // COMMAND #logwa: Kirim rekap ke TELEGRAM, bukan ke WA
                // ==============================================================
                if (textPesan.trim().toLowerCase() === '#logwa') {
                    const now = Date.now();
                    const batasWaktu = 24 * 60 * 60 * 1000; // 24 jam terakhir
                    let listNomor = [];

                    for (const [id, time] of Object.entries(db)) {
                        if (now - time <= batasWaktu) {
                            listNomor.push(`- ${id.split('@')[0]}`);
                        }
                    }

                    let rekapTelegram = `📊 *REKAP WA 24 JAM TERAKHIR*\nTotal Pelanggan: ${listNomor.length} orang\n\n`;
                    rekapTelegram += listNomor.length > 0 ? listNomor.join('\n') : 'Belum ada chat masuk dalam 24 jam terakhir.';

                    // Tembak langsung ke Telegram lu!
                    await sendTelegramLog(rekapTelegram);
                    console.log(`[LOG] Perintah #logwa dieksekusi, rekap dikirim ke Telegram.`);
                    continue; 
                }
                // ==============================================================

                if (shouldReply(senderId)) {
                    processingUsers.add(senderId);
                    db[senderId] = Date.now();
                    saveDB();

                    const nomorPelanggan = senderId.split('@')[0];
                    const namaPelanggan = msg.pushName || 'Pelanggan';
                    console.log(`\n[LOG] Membalas chat otomatis ke ${nomorPelanggan}...`);

                    // ==============================================================
                    // KURIR PINTAR: Langsung baca isi file .md secara real-time
                    // ==============================================================
                    let replyText = "Pesan otomatis sedang dalam perbaikan.";
                    if (fs.existsSync('./pesan_toko.md')) {
                        replyText = fs.readFileSync('./pesan_toko.md', 'utf-8');
                    }
                    
                    let captionQris = "Kirim pembayaran via QRIS.";
                    if (fs.existsSync('./pesan_qris.md')) {
                        captionQris = fs.readFileSync('./pesan_qris.md', 'utf-8');
                    }

                    try {
                        // 1. Kirim pesan jadwal toko
                        await sock.sendMessage(senderId, { text: replyText });

                        // 2. Kirim pesan gambar QRIS + caption
                        const qrisPath = findImage('qris');
                        if (qrisPath) {
                            await sock.sendMessage(senderId, { image: fs.readFileSync(qrisPath), caption: captionQris });
                        } else {
                            await sock.sendMessage(senderId, { text: captionQris + "\n\n_(Sistem: File QRIS belum ada di server)_" });
                        }

                        // 3. Tembak Micro-Log ke Telegram
                        await sendTelegramLog(`[WA ATEKA]\nPelanggan: ${namaPelanggan}\nNomor: ${nomorPelanggan}\nStatus: Terkirim Auto-Reply (Jeda ${COOLDOWN_DAYS} Hari)`);

                        console.log(`[SUCCESS] Auto-reply mendarat ke ${nomorPelanggan}`);
                    } catch (error) {
                        console.error('[ERROR] Gagal membalas:', error);
                    } finally {
                        processingUsers.delete(senderId); // Buka kunci antrean
                    }
                }
            }
        } catch (err) {
            console.error('[ERROR] Error di event upsert:', err);
        }
    });
}

startBot();
