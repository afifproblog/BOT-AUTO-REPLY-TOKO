const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');

// Setup input terminal
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Database memori sederhana
const dbFile = './db_autoreply.json';
let db = {};
if (fs.existsSync(dbFile)) {
    try {
        db = JSON.parse(fs.readFileSync(dbFile));
    } catch (e) {
        db = {};
    }
}

function saveDB() {
    fs.writeFileSync(dbFile, JSON.stringify(db));
}

// Set sementara untuk mengunci nomor yang sedang dalam proses kirim (Anti-Spam / Anti-Race Condition)
const processingUsers = new Set();

function shouldReply(senderId) {
    // Jika nomor ini sedang diproses (misal sedang kirim gambar), TOLAK chat susulan!
    if (processingUsers.has(senderId)) return false;

    const now = new Date();
    const resetPoint = new Date(now);
    resetPoint.setHours(2, 0, 0, 0); 

    if (now < resetPoint) {
        resetPoint.setDate(resetPoint.getDate() - 1);
    }

    const lastReplied = db[senderId] || 0;
    return lastReplied < resetPoint.getTime();
}

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
        console.log(`\n========================================`);
        console.log(`PAIRING CODE LU: ${code}`);
        console.log(`========================================\n`);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'close') {
            console.log('[SISTEM] Koneksi terputus, menyambung ulang...');
            startBot();
        } else if (connection === 'open') {
            console.log('\n>>> BOT FOTOCOPY ATEKA (BAILEYS) AKTIF! <<<');
            console.log('Sistem Auto-Reply 24 Jam (Reset Otomatis 02:00 AM) Berjalan.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (!m.messages || m.messages.length === 0) return;

            for (const msg of m.messages) {
                // Abaikan pesan dari nomor bot sendiri atau pesan tanpa isi
                if (!msg.message || msg.key.fromMe) continue;

                const senderId = msg.key.remoteJid;

                // Abaikan chat grup dan status WA
                if (!senderId || senderId.endsWith('@g.us') || senderId.includes('broadcast')) continue;

                // Cek apakah nomor memenuhi syarat untuk dibalas
                if (shouldReply(senderId)) {
                    // PENTING: Kunci nomor ini saat ini juga sebelum kirim pesan!
                    processingUsers.add(senderId);
                    db[senderId] = Date.now();
                    saveDB();

                    console.log(`\n[LOG] Membalas chat otomatis ke ${senderId.split('@')[0]}...`);

                    const replyText = `(Chat Otomatis BOT) Ada yang bisa dibantu dengan toko fotocopy ateka (Jl.S.Parman 29 depan Masjid Kodim), menyedikan kebutuhan ATK, dan jasa scan, copy maupun cetak berbagai jenis dokumen, foto serta id-card buka setiap hari\n` +
                        `- minggu 08.00-16.00 dan 19.00 - 21.00\n` +
                        `- senin 08.00-17.00 dan 19.00 - 21.00\n` +
                        `- selasa 08.00-17.00 dan 19.00 - 21.00\n` +
                        `- rabu 08.00-17.00 dan 19.00 - 21.00\n` +
                        `- kamis 08.00-17.00 dan 19.00 - 21.00\n` +
                        `- jumat 08.00-16.00\n` +
                        `- sabtu 08.00-16.00\n\n` +
                        `jika ingin mengambil pesanan barang diluar jam toko boleh hubungi wa pribadi 0821-5146-4979`;

                    const captionQris = `untuk pembayaran via qris bisa dibawah ini.\n\nPeringatan: chat belum dibaca, tunggu sampai dibalas oleh admin`;

                    try {
                        // 1. Kirim jadwal toko
                        await sock.sendMessage(senderId, { text: replyText });

                        // 2. Kirim QRIS
                        const qrisPath = findImage('qris');
                        if (qrisPath) {
                            await sock.sendMessage(senderId, { 
                                image: fs.readFileSync(qrisPath), 
                                caption: captionQris 
                            });
                        } else {
                            await sock.sendMessage(senderId, { text: captionQris + "\n\n_(Sistem: File QRIS belum ada di server)_" });
                        }

                        console.log(`[SUCCESS] Auto-reply mendarat ke ${senderId.split('@')[0]}`);
                    } catch (error) {
                        console.error('[ERROR] Gagal membalas:', error);
                    } finally {
                        // Buka kunci memori setelah selesai kirim
                        processingUsers.delete(senderId);
                    }
                }
            }
        } catch (err) {
            console.error('[ERROR] Error di event upsert:', err);
        }
    });
}

startBot();
