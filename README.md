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

## 🏟️ 2. Arena Yerleşimi (1080 x 1920)

- **Üst %20 [0 - 384px]:** Kırmızı Takım Sahnesi & Kale Çizgisi (`#FF0055`). Kırmızı karakterler aşağıya doğru dizilir.
- **Orta %60 [384 - 1536px]:** Sıfır Yerçekimi Savaş Koridoru (`#0D0B18`). Perspektif ızgara zemin, sınır lazer bariyerleri ve devasa plazma Enerji Topu (The Ball).
- **Alt %20 [1536 - 1920px]:** Mavi Takım Sahnesi & Kale Çizgisi (`#00E5FF`). Mavi karakterler yukarıya doğru dizilir.

---

## 🔄 3. Oyun Döngüsü & Durum Makinesi (5 Aşama)

1. **Aşama 1: Lobi & Katılım (30 Saniye)**
   - Ekranda geri sayım sayacı çalışır.
   - Sadece takipçiler yoruma **"kırmızı"** veya **"mavi"** yazarak katılabilir.
   - **%10 Otomatik Takım Dengesi:**
     * 10 oyuncudan azken: İki takım arasındaki fark en fazla 1 olabilir.
     * 10 oyuncu ve üzerindeyken: `|Kırmızı - Mavi| <= Toplam * 0.10`.
     * Bir takım aşırı yüklendiğinde, oyuncu otomatik olarak diğer takıma atanır ve ekranda bildirim afişi çıkar.
   - Katılan karakter gökyüzünden elastik bir sekme (`bounce.out`) ile sahneye iner.

2. **Aşama 2: Kadro Tanıtımı (10 Saniye)**
   - Ekran ikiye bölünür. Kırmızı ve Mavi takımlar stadyum ızgarasında düzenli sıralanır.
   - Parlayan isimlikler ve savaş anonsu görünür.

3. **Aşama 3: Halat Çekme Savaşı / Tug-of-War (Maks. 60 Saniye)**
   - Devasa enerji topu tam ortada (Y = 960px) belirir.
   - Oyuncular kale çizgisine dizilip enerji ışınlarıyla topu iter:
     * **Yorum:** Karşı taraf yönüne **+%0.15** itme darbesi.
     * **Beğeni (Like):** Karşı taraf yönüne **+%0.15** itme darbesi.
     * **Hediye (Elmas):** Elmas değerine göre **+%1.5 ile +%3.5** arası dev darbe. Hediye atan oyuncu 1.5x büyür!
   - **Fizik:** Hız sönümleme (damping: 0.94) ve maksimum terminal hız saniyede en fazla %5 ekran mesafesi (96 px/saniye) ile ani bitişler önlenir.
   - **Kazanma Şartları:**
     * Top Y <= 384px (Kırmızı Kalesi) noktasına ulaşırsa: **MAVİ TAKIM KAZANIR!**
     * Top Y >= 1536px (Mavi Kalesi) noktasına ulaşırsa: **KIRMIZI TAKIM KAZANIR!**
     * 60 saniye dolarsa: Topu kendi kalesinden en uzağa iten takım kazanır.

4. **Aşama 4: Zafer Podyumu & Kutlama (15 Saniye)**
   - Kazanan takımın renginde konfeti, havai fişekler ve lazer ışıkları patlar.
   - **Orta Podyum:** Kazanan takımın en çok hediye gönderen **İlk 3 Oyuncusu** altın taçlarıyla dev ölçekte zıplar.
   - **Yan Kademeler:** En çok beğeni/yorum atan ilk 5 oyuncu basamaklarda yer alır.
   - **Kaybeden Takım:** Köşelerde çöküş ve yenilgi animasyonu ile bekler.

5. **Aşama 5: MVP Liderlik Tablosu (10 Saniye)**
   - Yan yana iki neon siber kart:
     * Kazanan Takımın En İyi 5 Katkı Sağlayıcısı (Karakter, Kullanıcı Adı, Puan, İstatistikler)
     * Kaybeden Takımın En İyi 5 Katkı Sağlayıcısı
   - 10 saniye sonra oyun otomatik olarak sıfırlanır ve Aşama 1'e (Lobi) döner.

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
