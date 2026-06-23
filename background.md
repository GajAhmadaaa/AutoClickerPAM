# Latar Belakang Pembuatan (Background / Backstory) — AutoClickerPAM

Dokumen ini menjelaskan latar belakang, masalah dunia nyata (*pain points*), dan alasan mengapa ekstensi **AutoClickerPAM** ini dirancang secara khusus untuk mengatasi kendala produktivitas saat menggunakan **ManageEngine PAM360** dan **Windows Server**.

---

## 🛑 Masalah Utama: Proteksi Sesi yang Agresif

Dalam lingkungan kerja *enterprise*, keamanan akses server adalah prioritas utama. Namun, kebijakan keamanan yang terlalu ketat sering kali menciptakan hambatan besar bagi produktivitas harian:

1. **Auto-Logout Portal PAM360**:
   ManageEngine PAM360 memiliki fitur *idle session timeout* yang dikonfigurasi secara terpusat oleh administrator. Jika sistem tidak mendeteksi aktivitas pengguna di browser selama beberapa menit (biasanya 5–15 menit), sesi portal akan ditutup secara otomatis. Hal ini memaksa pengguna untuk melakukan login ulang menggunakan Multi-Factor Authentication (MFA) atau OTP yang memakan waktu.

2. **Pemutusan Sesi Remote (RDP/SSH)**:
   Saat sesi portal PAM360 terputus, semua koneksi remote RDP/SSH berbasis HTML5 Gateway yang sedang berjalan di dalam tab browser juga akan **diputus secara paksa**. 

3. **GPO Windows Server Timeout**:
   Selain di level portal PAM, sistem operasi Windows Server tujuan sering kali memiliki kebijakan Group Policy (GPO) yang memutus koneksi atau mengunci layar (*lock screen*) jika tidak ada input aktivitas dalam jangka waktu tertentu.

---

## ❌ Mengapa Solusi Tradisional Gagal?

Banyak pengguna mencoba menggunakan berbagai metode umum untuk menjaga sesi tetap aktif, namun metode-metode tersebut memiliki kelemahan fatal:

* **Auto-Refresh Halaman (F5/Reload)**:
  Melakukan *refresh* halaman web akan langsung memutus koneksi RDP/SSH yang sedang aktif di dalam gateway HTML5 PAM360. Pengguna harus mengulang koneksi dari awal dan kehilangan progres kerja di layar server.
* **Auto-Clicker Umum (Mengklik Tombol)**:
  Portal PAM360 berisi tombol-tombol sensitif (seperti *Delete*, *Reset Password*, *Disconnect Session*). Mengklik area acak di halaman web sangat berisiko memicu tindakan yang tidak diinginkan atau bahkan merusak data.
* **Hardware Mouse Jiggler (USB)**:
  Banyak kebijakan IT kantor yang memblokir pemasangan perangkat USB baru yang tidak dikenal. Selain itu, *mouse jiggler* fisik menggerakkan kursor asli komputer utama Anda, sehingga mengganggu aktivitas mengetik atau bekerja di aplikasi lain.

---

## 💡 Solusi yang Ditawarkan oleh AutoClickerPAM

Ekstensi **AutoClickerPAM** dirancang sebagai solusi cerdas, aman, dan tidak invasif untuk mengatasi masalah di atas dengan pendekatan berikut:

1. **Menyasar Tab Spesifik**:
   Hanya bekerja pada tab target yang dipilih secara manual oleh pengguna (misalnya tab portal PAM360). Pengguna bebas bekerja di tab lain, membalas chat di Teams/Slack, atau membuka aplikasi lain tanpa terganggu.
2. **Simulasi Aktivitas Mikro (Non-Intrusif)**:
   Ekstensi ini **tidak pernah** mengklik tombol, mengubah data, mengirim formulir, atau memuat ulang halaman. Ia hanya mengirimkan sinyal aktivitas mikro berupa:
   * Pergerakan mouse acak sangat kecil (0–50 piksel) yang tidak kasat mata.
   * Event *focus* pada layar browser.
   * Efek scroll 1 piksel ke bawah dan langsung kembali ke posisi semula dalam waktu 200 milidetik.
3. **Kompatibilitas Multiframe (`allFrames: true`)**:
   Karena sesi RDP/SSH PAM360 dirender di dalam `iframe` (sub-halaman), ekstensi ini menyuntikkan event simulasi ke halaman utama *dan* seluruh `iframe` di dalamnya. Sinyal aktivitas ini diteruskan oleh HTML5 gateway ke Windows Server tujuan, sehingga mencegah *idle timeout* baik pada portal PAM360 maupun sistem operasi Windows Server di dalam RDP.
4. **Hemat Sumber Daya & Otomatis**:
   Berjalan dengan `chrome.alarms` di latar belakang (Service Worker) yang ramah baterai/RAM, serta secara otomatis mendeteksi dan berhenti apabila tab target ditutup oleh pengguna.
