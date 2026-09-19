const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const readline = require('readline');

// Setup input terminal
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Database memori sederhana agar bot tidak lupa siapa yang sudah dibalas saat direstart
const dbFile = './db_autoreply.json';
let db = {};
if (fs.existsSync(dbFile)) {
    db = JSON.parse(fs.readFileSync(dbFile));
}

// Menyimpan log chat ke database file
function saveDB() {
    fs.writeFileSync(dbFile, JSON.stringify(db));
}

// Fungsi ngecek apakah jam sekarang udah lewat jam 2 pagi dari chat terakhir user
function shouldReply(senderId) {
    const now = new Date();
    
    // Menetapkan titik reset pada jam 02:00:00 hari ini
    const resetPoint = new Date(now);
    resetPoint.setHours(2, 0, 0, 0); 

    // Jika sekarang masih sebelum jam 2 pagi, berarti batas resetnya adalah jam 2 pagi hari kemarin
    if (now < resetPoint) {
        resetPoint.setDate(resetPoint.getDate() - 1);
    }

    const lastReplied = db[senderId] || 0;
    
    // Bales lagi HANYA kalau chat terakhirnya sebelum waktu reset (jam 2 pagi tadi/kemarin)
    return lastReplied < resetPoint.getTime();
}

// Fungsi mendeteksi file gambar QRIS otomatis (jpg/png)
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
        const msg = m.messages[0];
        
        // Abaikan pesan dari diri sendiri atau pesan kosong
        if (!msg.message || msg.key.fromMe) return;

        const senderId = msg.key.remoteJid;

        // Abaikan chat dari Grup (biar nggak nyepam) dan status WA
        if (senderId.endsWith('@g.us') || senderId === 'status@broadcast') return;

        // Cek apakah user ini memenuhi syarat untuk dibalas (sudah reset jam 2 pagi)
        if (shouldReply(senderId)) {
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
                // 1. Mengirim teks jadwal toko
                await sock.sendMessage(senderId, { text: replyText });

                // 2. Mengirim gambar QRIS beserta peringatan
                const qrisPath = findImage('qris');
                if (qrisPath) {
                    await sock.sendMessage(senderId, { 
                        image: fs.readFileSync(qrisPath), 
                        caption: captionQris 
                    });
                } else {
                    // Fallback jika file qris.jpg lupa ditaruh di folder
                    await sock.sendMessage(senderId, { text: captionQris + "\n\n_(Sistem: File QRIS belum ada di server)_" });
                }

                // 3. Catat waktu pengiriman agar tidak di-spam seharian
                db[senderId] = new Date().getTime();
                saveDB();
                
                console.log(`[SUCCESS] Auto-reply mendarat ke ${senderId.split('@')[0]}`);

            } catch (error) {
                console.error('[ERROR] Gagal membalas:', error);
            }
        }
    });
}

startBot();