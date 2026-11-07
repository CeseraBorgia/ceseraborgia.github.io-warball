# ⚡ BallWar - TikTok Canlı Yayın İnteraktif Halat Çekme Oyunu (Tug-of-War)

> **Hedef Çözünürlük:** 1080 x 1920 (9:16 Dikey / TikTok Live Studio / OBS Studio Formatı)  
> **Teknoloji Yığını:** Pixi.js (WebGL 2D Render Motoru), GSAP (Tween & Animasyonlar), Web Audio API (Sentezlenmiş Efektler), TikTok Live Connector  
> **Canlı Adres / GitHub Pages:** `https://ceseraborgia.github.io/ceseraborgia.github.io-warball`

---

## 🎮 Proje Özellikleri

### 1. Prosedürel Siberpunk / Rave 2D Karakter Sistemi
Her katılan izleyici, şık ve fütüristik Lunar Rave / Siberpunk sokak stili bir insan karakteriyle temsil edilir:
- **Deterministik Üretim (`uniqueId` Hashleme):** Her izleyici kendi TikTok ID'sine göre her zaman **birebir aynı** benzersiz karaktere sahip olur.
- **Modüler Parçalar:**
  - **Ten Tonları:** Açık, Buğday, Esmer ve siber hat desenli neon siber-tenler (Lavanta, Açık Camgöbeği, Obsidiyen Krom).
  - **Saç Stilleri & Neon Renkler:** Mohikan, Siber Undercut, Örgüler/Dreadler, Çılgın Anime Kakülleri, Çift Rave Topuzları ve Sivri Punk saçlar (Neon Pembe, Asit Yeşili, Elektrik Camgöbeği, Mor, Platin Beyazı, Siber Turuncu).
  - **Kıyafetler:** Taktik Çelik Yelekler, Siber Büstiyerler, Holografik Deri Ceketler, Neon File Üstler, Kargo Techwear pantolonlar ve parlayan tabanlı sneakerlar.
  - **Aksesuarlar:** Işıklı Siber Vizörler, Rave Matris Gözlükleri, DJ Rave Kulaklıkları, Filtreli Siber Maskeler ve Neon Boynuzlar.
  - **İsimlik (Nametag):** Oyuncunun TikTok kullanıcı adını ve takımının neon rengini taşıyan dinamik rozet. Takipçiler için yeşil doğrulama rozeti.
- **Karakter Durumları & Animasyonları:**
  - `idle`: Organik nefes alma, esneme ve yaylanma animasyonu.
  - `pushing`: Ortadaki enerji topuna doğru öne eğilerek ellerinden kesintisiz neon enerji dalgası/lazer ışını püskürtme.
  - `celebration`: Çift neon glowstick sallayarak sevinçle zıplama ve havaya ellerini kaldırma.
  - `defeat`: Baş öne eğik, omuzlar çökmüş hayal kırıklığı duruşu.
  - `giftAura`: Hediye atıldığında karakter anında **1.5 kat büyür**, patlayıcı bir enerji halesi ve şok dalgası saçar!

---

## 🏟️ 2. Arena Yerleşimi & 30v30 Stadyum Düzeni (1080 x 1920)

- **Üst Bölge (Kırmızı Takım, 3 Sıra x 10 = 30 Savaşçı):**
  * Sıra 1 (Arka Sıra): Y ≈ 170px
  * Sıra 2 (Orta Sıra): Y ≈ 250px
  * Sıra 3 (Ön Hat / VIP Hediye Alanı): Y ≈ 330px
- **Orta Koridor (Sıfır Yerçekimi Savaş Alanı):**
  * Kırmızı Kale Sınırı: **Y = 480px** (%25 çizgisi)
  * Tarafsız Merkez: **Y = 960px** (%50 çizgisi)
  * Mavi Kale Sınırı: **Y = 1440px** (%75 çizgisi)
  * Devasa plazma Enerji Topu ve yönlü şok dalgası halkaları.
- **Alt Bölge (Mavi Takım, 3 Sıra x 10 = 30 Savaşçı):**
  * Sıra 3 (Ön Hat / VIP Hediye Alanı): Y ≈ 1580px
  * Sıra 2 (Orta Sıra): Y ≈ 1660px
  * Sıra 1 (Arka Sıra): Y ≈ 1740px

---

## 🔄 3. Oyun Döngüsü & Dinamik Kadro Sistemi

1. **Aşama 1: Lobi & Katılım (30 Saniye)**
   - Ekranda geri sayım sayacı çalışır. Takipçiler yoruma **"kırmızı"** veya **"mavi"** yazarak katılır.
   - **%10 Otomatik Takım Dengesi:** Eşitliği korumak için aşırı yüklenen takımdan diğerine otomatik transfer.

2. **Aşama 2: Kadro Tanıtımı (10 Saniye)**
   - Ekran ikiye bölünür, takımlar 30'ar kişilik disiplinli stadyum ızgarasında düzenlenir.

3. **Aşama 3: Halat Çekme Savaşı / Agresif Tug-of-War (Maks. 60 Saniye)**
   - Devasa enerji topu tam ortada (Y = 960px) belirir.
   - **Dinamik Kadro Önceliği (Gifter VIP + Rotasyon):**
     * **10 Kalıcı VIP Yuvası (Ön Hat):** Hediye gönderen oyuncular kalıcı VIP statüsü kazanır ve ön hatta kilitlenir. Asla beğeni/yorumla yedek sırasına düşürülmezler!
     * **20 Açık Yuva:** Beğeni ve yorum atanlar arasından `(Puan * 0.4) + (Yenilik Skoru * 0.6)` formülüyle en aktif oyuncular sahada tutulur. Kuyruktaki herhangi biri etkileşime girdiğinde en pasif oyuncunun yerine anında sahneye fırlar!
   - **Agresif İtme Ayarları (Erken Nakavt Dengesi):**
     * **Yorum:** Karşı taraf yönüne **+%0.45** itme darbesi.
     * **Beğeni (Like):** Karşı taraf yönüne **+%0.35** itme darbesi.
     * **Hediye (Elmas):** Elmas değerine göre **+%3.0 ile +%8.5** arası dev darbe. Hediye atan oyuncu 1.5x büyür, kalın mega-ışın ve ekran sarsıntısı tetiklenir!
     * **Terminal Hız:** Saniyede maksimum **%12** (230 px/sn) ekran mesafesi.
   - **Kazanma Şartları (Daraltılmış Sınırlar):**
     * Top Y <= 480px (Kırmızı Kalesi): **MAVİ TAKIM KAZANIR!**
     * Top Y >= 1440px (Mavi Kalesi): **KIRMIZI TAKIM KAZANIR!**
     * 60 saniye dolarsa: Topu rakip yarı sahaya daha çok iten takım kazanır.

4. **Aşama 4: Zafer Podyumu & Kutlama (15 Saniye)**
   - Sinematik dev kazanan anonsu ("★ KIRMIZI TAKIM ZAFERİ! ★").
   - **İlk 3 Hediye Şampiyonu:** Sahne ortasında **2.2x - 2.45x** dev ölçekte, başlarında parlayan **Kraliyet Taçları** (Altın, Gümüş, Bronz) ile zıplar.
   - **İlk 4 - 10 MVP'ler:** Yan podyum kanatlarında **1.65x** ölçekte sergilenir.
   - **Kazanan Takımın Kalanı:** Arka kademelerde minimum **1.40x** ölçekte çift neon glowstick sallayarak kutlama yapar.
   - **Kaybeden Takım:** Köşelerde karartılmış (alpha: 0.35, scale: 0.75x) yenilgi duruşu sergiler.

5. **Aşama 5: MVP Liderlik Tablosu (10 Saniye)**
   - Kazanan ve kaybeden takımın ilk 5 oyuncusunun istatistik tablosu gösterilir ve oyun yeni tura sıfırlanır.

---

## ⌨️ 4. Test Kısayolları & Canlı Geliştirici Paneli

Oyun açıldığında sağ alt köşede **"BALLWAR DEV TOOLS"** paneli yer alır:
- Klavye Tuşları:
  - **`R`**: Kırmızı takım etkileşimi simüle et (Oyuncu katılımı / Beğeni / Yorum).
  - **`B`**: Mavi takım etkileşimi simüle et.
  - **`G`**: Yüksek elmaslı hediye simüle et.
  - **`S`**: Sonraki oyun durumuna hızla atla (Lobi -> Tanıtım -> Savaş -> Podyum -> Tablo).
  - **`D`**: Ekrandaki Dev Araçlar panelini aç / kapat.

---

## 📡 5. Gerçek TikTok Yayınına Bağlanma (`server.js`)

Canlı TikTok yayınınızdaki gerçek yorumları, beğenileri ve hediyeleri anlık olarak oyuna aktarmak için:

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

2. Canlı yayındaki TikTok kullanıcı adınızla sunucuyu başlatın:
   ```bash
   node server.js KULLANICI_ADINIZ
   ```

3. `index.html` sayfasını tarayıcıda veya OBS'te açın. `server.js`, WebSocket (`ws://localhost:8081`) üzerinden oyuna anlık veri basacaktır.

---

## 🎥 6. OBS Studio & TikTok Live Studio Ayarları

1. OBS Studio'da **Kaynaklar (Sources) -> Ekle (+) -> Tarayıcı (Browser)** seçin.
2. **URL:** `https://ceseraborgia.github.io/ceseraborgia.github.io-warball` veya yerel dosya yolu.
3. **Genişlik (Width):** `1080`
4. **Yükseklik (Height):** `1920`
5. **Özel Kare Hızı:** `60 FPS`
6. Tam ekran dikey yayınınız için hazırsınız!

---

## 🚀 GitHub Pages Üzerinden Yayınlama

Bu repo GitHub Pages ile doğrudan uyumludur:
1. Değişiklikleri push edin:
   ```bash
   git add .
   git commit -m "BallWar TikTok Canlı Halat Çekme Oyunu"
   git push origin main
   ```
2. GitHub'da **Settings -> Pages** menüsüne gidin.
3. **Source:** `Deploy from a branch` -> `main` / `/(root)` seçin ve kaydedin.
4. Adresiniz: `https://ceseraborgia.github.io/ceseraborgia.github.io-warball`
