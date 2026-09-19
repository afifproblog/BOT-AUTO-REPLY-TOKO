# SOTA-STORE WhatsApp Bot (Baileys Engine)

Dokumentasi dan arsip proyek bot WhatsApp Sota Store menggunakan engine Baileys yang stabil, anti-error, serta dilengkapi integrasi Gemini AI dan fitur pengiriman media otomatis.

---

## 📂 STRUKTUR FILE REPOSITORY
Pastikan file-file berikut ada di dalam folder proyek GitHub lu:
1. index.js (Kodingan utama logika bot, Baileys, dan AI).
2. package.json (Konfigurasi dependencies/library).
3. PROMOTE-DC.png / PORTO-DC.png / file gambar portofolio pendukung lainnya.

> Catatan Penting: Folder node_modules/ dan auth_baileys/ tidak perlu di-upload ke GitHub publik demi keamanan sesi dan ukuran file yang ringkas.

---

## 🚀 PANDUAN SETUP & PINDAH DEVICE BARU
Jika lu ingin memindahkan proyek ini ke laptop atau perangkat baru, jalankan perintah ini secara berurutan di terminal (CMD/PowerShell):

1. Clone atau download repository ini ke folder baru di komputer.
2. Buka terminal di dalam folder proyek tersebut.
3. Install Dependencies (mengunduh modul Baileys, Pino, dan Google Generative AI secara otomatis):
   npm install

4. Jalankan Bot:
   node index.js
   *(Masukkan nomor WhatsApp bot saat diminta di terminal untuk memunculkan Pairing Code).*

---

## 🛠️ DAFTAR PERINTAH TERMINAL (CHEAT SHEET) & FUNGSINYA

- node index.js 
  # Fungsi: Menjalankan program utama bot WhatsApp.

- npm install 
  # Fungsi: Mengunduh dan memasang seluruh library/dependencies yang terdaftar di package.json.

- npm cache clean --force 
  # Fungsi: Membuang dan membersihkan sampah memori/cache NPM jika terjadi error saat instalasi.

- taskkill /F /IM node.exe 
  # Fungsi: Mematikan paksa proses Node.js yang berjalan di background (jika bot ngadat/nyangkut).

- dir *.png *.jpg *.jpeg 
  # Fungsi: Menampilkan daftar file gambar yang ada di dalam direktori folder aktif.

- rd /s /q auth_baileys 
  # Fungsi: Menghapus folder sesi login secara total untuk mengganti nomor bot atau reset koneksi dari awal.

npm uninstall whatsapp-web.js #UNNINSTALL OLDER PROGRAMM CAN'T RUN CORRECTLY
npm install @whiskeysockets/baileys pino #INSTALL FIX PROGRAM FROM BEST FILE IN GITHUB
npm install #ADD ON PROGRESS INSTALL TO RUN MAIN PROGRAM 
npm cache clean --force #REMOVE ALL ERROR MEMORY CHACE
npm init -y  #MAKE A NEW PROGRAMM IN TERMINAL WITHOUT CHACE ON OLD FILE
node index.js #RUN PROGRAM CODING ON TERMINAL PC
npm install whatsapp-web.js #INSTALL NPM AS OFFICIAL WA-WEB 
dir *.png *.jpg *.jpeg #SHOW ITEM DIRECTORY AS IMAGE
rd /s /q .wwebjs_cache #REMOVE CHACE AND RESTART BOT
taskkill /F /IM node.exe #REMOVE Node.js on background
taskkill /F /IM chrome.exe #REMOVE PROGRESS CHROME ON BACKGROUND
npm install github:pedroslopez/whatsapp-web.js#main #INSTALL NPM ON GITHUB (@USER)