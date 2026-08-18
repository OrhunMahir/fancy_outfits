# FANCY OUTFITS — Shared Development Logbook

Bu dosya Codex ve Claude Code arasındaki kısa, güncel handoff kaynağıdır. Ayrıntılı mimari ve
tarihçe için `CLAUDE.md`, tasarım kuralları için `FANCY_OUTFITS_GDD.md` okunmalıdır.

## Çalışma protokolü

Her çalışma oturumunda:

1. Önce `AGENTS.md`, bu dosya ve ilgili kod okunur.
2. Başlamadan önce `git status --short --branch` ve son commit kontrol edilir.
3. Kullanıcının değişiklikleri korunur; başka aracın yarım işi üzerine körlemesine yazılmaz.
4. Oyun mantığında `Math.random` kullanılmaz; deterministik `rand()` / `rnd()` korunur.
5. Save formatı değişirse schema migration, strict validation ve reload testi birlikte eklenir.
6. Minigame sonucu davayı otomatik kazandırmaz; yalnız kanıt/dossier/teknik avantaj sağlar.
7. Oturum sonunda bu dosyanın en üstüne yeni bir tarihli kayıt eklenir: yapılanlar, testler,
   commit ve sıradaki kesin adım.

---

## 2026-08-18 — Claude: lockpick rebuilt as tension + snap (v1.9.24)

### Git checkpoint

- Branch: `minigames`, base commit `3a1535e2a`. v1.9.23 ve bu kayıt birlikte commit bekliyor.
- Dokunulan dosyalar: `src/game/minigames.js`, `engine.js`, `constants.js`, `content.js`,
  `casegen.js`, `src/components/minigames/LockpickMinigame.jsx`, `src/styles.css`,
  `scripts/v195-check.mjs`, `README.md`, bu dosya.

### Yeni mekanik (kullanıcı isteği)

Eskisi: −70..+70 arası bir açı seç, "TEST LOCK" bas, 3 hakkın var. Sürükleme bedava, tek karar
"doğru sayıyı bul"du.

Yenisi **gerilim**: çubuğu ittikçe pikap kilide yüklenir.
- `give` (gizli veriş noktası) ± `tolerance` aralığında TURN edersen kilit açılır.
- `breakAt` eşiğini geçersen **pik kırılır ve o hak gider** — TURN'e basmana gerek yok, itmek
  başlı başına bir hamle. Bu yüzden `setLockTension` artık kayda yazan gerçek bir engine aksiyonu.
- Erken çevirmek de hakkı yakar. Yani iki yönlü risk: az bastın → boşa gitti, çok bastın → kırıldı.
- El, doğruyu dürüstçe söyler: `lockFeel` dead → shift → **give** → strain. Beceri, "veriyor"
  bandında durup bir tık daha itmemek.

**Hak sayısı SNEAKY'ye bağlandı** (kullanıcının istediği gibi ilk seviyede tek hak):

| SNEAKY | pik | veriş bandı | kırılmadan önceki pay |
|---|---|---|---|
| 0 | **1** | 9 birim | ~8-10 |
| 2 | 2 | 13 birim | ~9-10 |
| 5 | 3 | 19 birim | ~10-13 |

SNEAKY hem fazladan pik veriyor hem bandı genişletiyor hem de kırılma payını büyütüyor — yatırım
üç yerden birden hissediliyor.

### Simülasyonla yapılan denge turu (kullanıcı "simülasyonla göster" dedi)

İlk uygulama **fazla affediciydi** ve bunu ancak simülasyon gösterdi: gerçek modeli süren botlarla
500 kilit oynattığımda dikkatli oyuncu **%100** açıyordu, aceleci bile. İki kök neden:

1. "silindir dönmek istiyor" uyarısı TAM olarak kazanan bandı işaret ediyordu → risk yok.
2. kırılmaya kalan pay (5-10) adım boyundan (3) büyüktü → bir tık fazla itmek asla kırmıyordu.

Düzeltme: uyarı artık **erken ve değişken** başlıyor (`hintLead`, kilit başına 0..21 birim; sabit
`LOCK_HINT_SPREAD=22` — SNEAKY'ye bağlı DEĞİL, yoksa yatırım belirsizliği büyütürdü), kısa sürede
bitiyor (`hintTail` 1..3) ve `LOCK_BREAK_MARGIN` 5→2'ye indi. `lockFeel` artık yakınlık söylüyor,
cevabı değil; gerçek band `lockGives` ile ayrıldı.

Ölçüm sonucu (600 kilit/hücre, `scripts/locksim-report.mjs`):

| oyuncu alışkanlığı | SNEAKY 0 (1 pik) | SNEAKY 2 (2 pik) | SNEAKY 5 (3 pik) |
|---|---|---|---|
| ilk sinyalde çevir (ürkek) | %11.5 | %11.5 | %11.5 |
| +2 tık sonra çevir | %40.2 | %39.7 | %39.7 |
| +4 tık derin kumar | %44.0 | %60.2 | %66.7 |
| **öğrenen** (0, +2, +4…) | %11.5 | %39.7 | %66.7 |

Derin kumar SNEAKY 0'da koşuların %9.5'inde pikin kırılmasıyla bitiyor; ürkek oyuncu hiç kırmıyor
ama nadiren açıyor. Yani ödünleşim gerçek. Fazladan pikler ancak oyuncu denemeler arası
DAVRANIŞINI değiştirirse işe yarıyor — "öğrenen" satırı bunu gösteriyor; sabit strateji güden bot
ikinci pikte aynı hatayı tekrarlıyor. Bu bilinçli: kilit ezberlenmiyor, okunuyor.

### Görsel

Kilit silindiri artık gerilimle **yükselen pimler**, yüklendikçe bükülen pik, SLACK → UNDER LOAD →
STRAINING → ABOUT TO GO okuması ve renk değiştiren bir gerilim göstergesi taşıyor. Gösterge mutlak
basınca göre renkleniyor — gizli veriş noktasını sızdırmıyor. Fare/dokunma için 48px EASE OFF /
PUSH düğmeleri, klavye için range input.

### Save uyumu — bilinçli karar

Açı modeli ile gerilim modeli ortak geometri paylaşmıyor; yarım kalmış bir kilidi "dönüştürmek"
uydurma olurdu. `migrateV18ToV19` açık lockpick challenge'ını **düşürüp** dosyanın
`actionInProgress` işaretini siliyor: covert seçenek harcanmamış olarak masaya dönüyor. Oyuncu
hiçbir şey kaybetmiyor, sadece kilidi yeni kurallarla yeniden açıyor. Power Cut'taki RULES 0
yaklaşımı burada uygulanmadı çünkü iki ayrı model + iki ayrı arayüz bakmak gerekirdi.
Eski testlerdeki "v9/v11 kariyeri açık kilidi kaldığı yerden sürdürür" garantisi, yerini "kilit
bütün olarak iade edilir ve yeniden açılabilir" garantisine bıraktı.

### Testler

- `npm test` yeşil. Yeni/port edilen bloklar: rank 0'da tek pik, `breakAt` payının varlığı,
  veriş bandında TURN → açılış, `breakAt`'e itince TURN'süz kırılma → coin, erken TURN'ün hakkı
  yakması, SNEAKY'nin pik/band/pay üçlüsünü birden büyütmesi, "kırılma noktasının ötesinde duran
  pik" ve "payı sıfırlanmış kilit" save tamper'ları, v9/v11 iade yolu.
- `npm run build` ve `npm run test:soak` (replay 336/336, integrity 0) yeşil.
- `scripts/locksim-report.mjs` (yeni): gerçek modülü süren, oynanabilirlik ölçen headless bot
  raporu. `node scripts/locksim-report.mjs` ile tekrar koşulabilir; denge ayarı yapılacaksa önce
  buna bakılmalı.
- Tarayıcı: gerilimi 63'e kadar itip STRAINING/kırmızı pimleri gördüm, EASE OFF ile banda dönüp
  TURN ile açtım (+12 kanıt kenarı, seçenek dosyadan düştü); ayrı bir kilitte `breakAt`'e itip tek
  pikin kırılmasını ve doğrudan coin call'a düşmesini doğruladım. Konsol temiz.
- İçerik metni de güncellendi: "three quiet attempts" artık yalan olurdu.

### Skyrim tadında ikinci tur (kullanıcı isteği)

- **Göbek pikle birlikte dönüyor:** gerilim arttıkça `.lock-plug` (keyway ile birlikte) 0.75°/birim
  döner, pik aynı açıyla keyway'in içinde durur. Pimler DÖNMEZ — onlar gövdeye ait, sadece
  yükselirler; ilk denemede pimleri de döndürmüştüm, yanlış görünüyordu.
- **Zorladıkça titriyor:** `.lock-cylinder` üç kademeli `lock-tremor` animasyonu alır
  (working/high/critical). Titreme **mutlak basınca** bağlı, gizli veriş noktasına değil — yoksa
  görsel efekt bulmacayı çözerdi. Titreme transform kullandığı için silindirin ortalaması
  `translate(-50%,-50%)`'ten margin'e taşındı (ilk denemede kilit köşeye kaçtı, ekran görüntüsünde
  yakalandı).
- **Kırılan pik kilitte kalıyor:** `brokeInLock` — yalnız SON pik kırılınca true (yedek varken
  stub'ı çıkarıp devam edersin). Keyway'de görünür bir kırık parça çizilir, okuma "PICK SHEARED"
  olur.
- **Yazı-tura artık başarısızlık türünü anlatıyor** (`COIN_TEXT`): parça kaldıysa tura = cımbızla
  çıkarırsın, yazı = parça kalır, sabah facilities çizik kilidi bulur, bina yöneticisi koridor
  kaydını ister ve kayıtta sen varsın. Parça yoksa (kilit basitçe dönmediyse) yakalanma sebebi
  koridordan geçen bir paralegal olur. Ekran başlığı da buna göre değişiyor
  ("HALF A PICK IN THE KEYWAY" / "FOOTSTEPS IN THE HALL") ve sonuç "STUB RECOVERED" /
  "THE LOCK KEEPS THE EVIDENCE" diyor.
- Dava metinlerindeki `escape`/`caught` yazıları **sonuca** odaklanacak şekilde yeniden yazıldı;
  "nasıl yakalandın" artık yazı-turanın işi, yoksa iki anlatı çelişiyordu.

### Sıradaki kesin adım

Değişmedi: **mobil layout + Capacitor**.

---

## 2026-08-18 — Claude: sabotage difficulty curve + first-run walkthrough (v1.9.23)

### Git checkpoint

- Branch: `minigames`, base commit `3a1535e2a` (yazı-tura kullanıcı tarafından pushlandı; bu
  oturumun işi commit bekliyor).
- Dokunulan dosyalar: `src/game/minigames.js`, `engine.js`, `state.js`, `constants.js`,
  `src/game/intro.js` (yeni), `src/components/IntroOverlay.jsx` (yeni),
  `src/components/minigames/PowerCutMinigame.jsx`, `src/App.jsx`, `src/styles.css`,
  `scripts/v195-check.mjs`, `README.md`, bu dosya.

### 1 — Elektrik sabotajı artık gerçek bir tırmanış (kullanıcı isteği)

Üç halka neredeyse aynı zorluktaydı (durdurma penceresi 514/360/248 ms). Yeni eğri kullanıcının
istediği kolay→orta→zor: **677 / 330 / 182 ms** (SNEAKY 0'da). Üçüncü halka 132°/s ile dönüyor
(eskiden 105). Hız tabanları `[56,88,120]`, tolerans tabanları `[20,13,9]`; jitter ve SNEAKY
indirimi aynen korundu — maksimum SNEAKY'de pencereler 1439/778/466 ms'e açılıyor, yani yatırımın
karşılığı büyüdü.

- `POWER_CURVES` tablosu + `POWER_RULES=1`. **RULES 0 (eski eğri) kod içinde duruyor**: save'de
  açık bir board varsa oyuncu dağıtıldığı eğriyle devam eder. Denge değişikliği hiç kimsenin yarım
  bulmacasını geçersiz kılmaz.
- `createActionChallenge` artık `powerRules` parametresi alıyor; save doğrulaması board'u
  **kayıttaki kurala göre** yeniden türetip karşılaştırıyor.
- Save schema v18 + `migrateV17ToV18`: v17'de açık olan power board'a `rules:0` damgalanır.
- UI: halka başlıkları "CIRCUIT 1 · WARM-UP / 2 · STEADY / 3 · FAST" diyor ki son halkanın
  hızlanması hata gibi değil tasarım gibi okunsun.
- Not: soak botları covert board oynamadığı için burada A/B kohortu anlamsız; zorluk eğrisi
  deterministik testlerle (hız/pencere sıralaması + insanca durdurulabilirlik alt sınırı) kilitlendi.

### 2 — İlk açılışta walkthrough (kullanıcı isteği)

- `src/game/intro.js`: dört kart (THE DESK / THE CLOCK / THE CHOICE / THE LADDER) + `fo_intro_v1`
  bayrağı. Saf veri; React bilmiyor.
- `S.introStep` **transient**: `isPaused()`'a girer (masayı kilitler), hem `saveGame` hem
  `hydrateSaveData` tarafından soyulur. Kariyer kaydına yazılmaz — bir oyuncunun özelliği, bir
  run'ın değil.
- `startGame` ilk kez oynayana kartları açar; SKIP de bitirmek sayılır. Klavye: Space/Enter ilerlet,
  Esc atla. `loadGame` (CONTINUE) asla açmaz.
- Test bu turda gerçek bir kusur yakaladı: `introStep` ilk uygulamada **kayda yazılıyordu** (soyma
  yalnız yükleme tarafındaydı). saveGame destructuring'ine eklenerek düzeltildi.

### Testler

- `npm test` yeşil; yeni bloklar: eğri sıralaması (her halka bir öncekinden hızlı, penceresi dar),
  `windows[2]>=150ms` insanlık sınırı, legacy board'un korunması, "eski halkalar yeni kural
  etiketiyle" sahteciliğinin reddi, v17→v18 migration; walkthrough'un açılması/kapanması,
  ikinci kariyerde çıkmaması, save'e sızmaması.
- `npm run build` yeşil. `npm run test:soak` → replay 336/336, integrity 0.
- Tarayıcı: dört kart tıklanarak gezildi (pip'ler doluyor, son kart GET TO WORK), kapanınca masa
  açılıyor, ikinci run'da çıkmıyor. Sabotaj panelinde üç halka WARM-UP/STEADY/FAST etiketleriyle
  ve ölçülen 657/364/135 ms pencerelerle geldi. Konsol temiz (yalnız dev-server CSP uyarısı; ara
  HMR sırasında görülen `RING_GRADE` hatası düzeltilmiş sürümde yok).

### Sıradaki kesin adım

Değişmedi: **mobil layout + Capacitor**. Yazı-tura logosu notu bir önceki kayıtta duruyor.

---

## 2026-08-17 — Claude: struck coin (v1.9.22.1)

### Git checkpoint

- Branch: `minigames`, base commit `52a54c02b` (bu oturumda commit atılmadı).
- Dokunulan dosyalar: `src/components/minigames/CoinFlipMinigame.jsx`, `src/styles.css`,
  `scripts/v195-check.mjs` (aşağıdaki test düzeltmesi), `README.md`, bu dosya.

### Yazı-tura artık gerçek bir madeni para

- Eskisi: düz bir daire + ortasında "H"/"T" harfi, yerinde `rotateY` dönüşü.
- Yenisi: `transform-style:preserve-3d` ile **iki yüzü olan** bir para. HEADS = takım elbise
  (oyunun adı bu) + "PARSON HENDERSON" / "ATTORNEYS AT LAW" kuşakları; TAILS = adalet terazisi +
  "ONE VERDICT" / "FANCY OUTFITS". Yüzler 64 birimlik ızgarada inline SVG, asset yok.
- **Kenar:** 10 adet içi boş halka Z ekseninde istiflenir; `repeating-conic-gradient` tırtıl
  (milling) verir. İlk denemede dilimler DOLU daireydi ve para eğikken yüzü tamamen kapatıyordu —
  `mask:radial-gradient(...)` ile ortası boşaltıldı. Bu, bakılmadan fark edilmeyecek bir hataydı.
- **Hareket:** `coin-toss-*` keyframe'i parayı `translateZ(-520px)`'den `+120px`'e getirir — yani
  kameraya doğru gelir, yakında bir an asılı kalır, sonra kadraja oturur. Çağrı ekranında yavaş
  takla (`coin-tumble`) döner ki oyuncu iki yüzü de görsün. Altında ölçeğe göre büyüyen gölge var.
- **Doğru yüze inmek CSS'e gömülü:** heads `-1800deg` (tam tur katı), tails `-1620deg` (yarım tur
  fazlası). `animation-fill-mode:none` olduğu için animasyon bitince taban kurala düşer ve taban
  kural (`.coin3d-lands-tails{transform:rotateX(180deg)}`) aynı kareyi verir — ne sıçrama olur ne
  de `prefers-reduced-motion` altında yanlış yüz görünür.

### Bu turda yakalanan gerçek hata (kod değil, test)

`npm test`, kod değişmeden kırmızıya döndü: dün yazdığım iki assertion **tarihe bağlıydı**.
`fresh("daily")` senaryoyu günün tarihinden seçtiği için (a) kenar etkisini tamamlanma sınırının
iki yakasından ölçen assertion yorgunluk cezasını da ölçüyordu, (b) cevap anahtarını "yeniden
yazan" tamper senaryosu, o günün dağıtımında tesadüfen aynı anahtarı üretebiliyordu. İkisi de
değişmez (invariant) ölçüme çevrildi; `TZ` değiştirerek dört farklı tarihte doğrulandı. Bu hata
`52a54c02b`'de de vardı, yani pushlanmış haldeydi.

### Testler

- `npm test` yeşil (Kiritimati/Midway/UTC/İstanbul saat dilimlerinde ayrı ayrı koşuldu).
- `npm run build` yeşil.
- Tarayıcı: çağrı ekranında takla, atış sırasında 430ms ve 700ms kareleri dondurularak incelendi
  (yüz kapanmıyor, tırtıllı kenar görünüyor), iniş her iki yüzde de doğru. Konsolda yalnız
  dev-server CSP uyarısı.
- Not: Browser paneli arka plandayken animasyon saati donuyor; ilerlemeyi ölçmek için WAAPI ile
  kare dondurmak gerekti. Uygulama tarafında sorun değil.

### Kullanıcı kararı: para ileride oyunun logosu olacak

Kullanıcı bu parayı **oyunun logosu** yapmak istiyor; bu tur bilinçli olarak YAPILMADI, yalnız
buraya not edildi. Yapılacağı zaman:

- Yüz çizimleri şu an `CoinFlipMinigame.jsx` içinde gömülü. Logo işine girilirse önce paylaşılan
  bir `CoinArt` bileşenine (ör. `src/components/CoinArt.jsx`) çıkarılmalı; minigame ve logo aynı
  kaynaktan beslenmeli, çizim ikinci kez elle kopyalanmamalı.
- Kullanım yerleri: StartScreen başlığı, topbar amblemi, `index.html` favicon'u (SVG data-URI —
  asset dosyası kuralı bozulmadan), ileride Steam/itch kapak görseli.
- Favicon ve kapak için tek yüz yeter; HEADS (takım elbise) oyunun adıyla doğrudan örtüştüğü için
  daha güçlü aday.
- Dikkat: parodi isim kuralı (Parson Henderson) korunmalı; gerçek marka/kurum çağrıştıran ekleme
  yapılmamalı.

### Sıradaki kesin adım

Değişmedi: **mobil layout + Capacitor**. Öncesinde kullanıcı isterse GitHub Pages demosu (tek
workflow) — repo görünürlüğü ve demo yayınlama kararı kullanıcıya ait.

---

## 2026-08-13 — Claude: Contradiction Board (v1.9.22)

### Git checkpoint

- Branch: `minigames`, base commit `ea50a3894` (bu oturumda commit atılmadı; kullanıcı kendi
  pushlayacak).
- Dokunulan dosyalar: `src/game/minigames.js`, `engine.js`, `state.js`, `content.js`, `casegen.js`,
  `constants.js`, `src/components/minigames/ContradictionMinigame.jsx` (yeni),
  `ActionMinigameOverlay.jsx`, `CasePane.jsx`, `InfoOverlay.jsx`, `src/styles.css`,
  `scripts/v195-check.mjs`, `scripts/soak-balance.mjs`, `README.md`.

### Tasarım kararı — Timeline'ın tersi bir seçim

Timeline **istemsiz** (riskli hamleden sonra %25 açılır, ucuz, küçük kenar). Contradiction Board
bilinçli olarak onun zıddı yapıldı: dosyanın üzerinde **gönüllü bir seçenek** (`style:"prep"`),
1.5h + 6 FATIGUE peşin, karşılığında daha büyük kenar (+15). Böylece iki bulmaca aynı rolü
paylaşmıyor: biri sürpriz, diğeri saat-karşılığı-kenar takası.

COVERT makinesi (`o.action`) yeniden kullanıldı ama **covert semantiği kullanılmadı**: coin call
yok, yakalanma yok, `covertW/covertCaught` sayaçlarına yazmıyor, ayrı `contraTry/W/L` sayaçları
var. `validOption` artık aksiyon tipine göre etiketi zorluyor (`contradiction` → `prep`,
diğerleri → `covert`), böylece ikisi birbirinin etiketini ödünç alamıyor.

### Uygulanan

- **Board (`minigames.js`, saf):** `contradictionDeal` 6 çift + 3 decoy havuzundan `hash(runSeed|
  caseId|actionId)` kimliğiyle 3 çift + 1 decoy çeker, exhibit sütununu deterministik Fisher–Yates
  ile karıştırır. Paylaşılan `rand()` akışı **tüketilmez** (testte cursor eşitliğiyle doğrulandı).
- **Oynanış:** ifade seç → exhibit seç. Doğru eşleşme bankaya yazılır, yanlış eşleşme 4 denemeden
  birini yakar. Deneme biterse `contradiction_fail`. "CLOSE THE BINDER" erken çıkışta kanıtlananı
  saklar.
- **Ödül:** tam chart → `action.edge` (15); kısmi → `floor(edge*found/total)`; sıfır → kenar yok,
  −2 BOLD. Kenar mevcut `c.covertEdge` alanına yazılır (dosyanın kanıt kenarı; `chance()` ve save
  doğrulaması zaten bunu tanıyor), not metni prep diliyle basılır. Dosya **inbox'ta kalır** ve
  masaya geri açılır — hukuki karar hâlâ oyuncunun.
- **Ana kural:** court dosyaları artık prep taşıyabiliyor (`validCase` gevşetildi) ama **covert
  taşıyamıyor** — duruşma gecesi exhibit hazırlamak mantıklı, hırsızlık değil. Test bunu zorluyor.
- **İçerik:** el yazması `court2` (Pemberton) gövdesi 6 çelişki + 3 decoy taşıyacak şekilde
  yeniden yazıldı; prosedürel şablon 4 (tartışmalı vasiyet) %50 ihtimalle kendi board'unu taşıyor
  ve üretilen isim/mekân ifadelere giriyor.
- **UI:** `ContradictionMinigame.jsx` iki sütun, her kart 48px dokunma hedefi, ≤520px'te alt alta
  yığılıyor; sürükle-bırak yok. Kicker "CASE PREP · CONTRADICTION BOARD", sonuç paneli `n/m`
  gösteriyor. `.btn.prep` covert morundan ayrı (soğuk mavi) — gece işi değil.
- **Save schema v17:** `migrateV16ToV17` sayaçları backfill eder; `validContradictionChallenge`
  board yapısını, deneme/tur tutarlılığını ve bankaya yazılmış her çiftin gerçek çözüm çifti
  olduğunu doğrular; load sırasında board kimlikten yeniden türetilip karşılaştırılır.

### Testler

- `npm test` yeşil. Yeni blok: deal determinizmi (aynı run aynı board, farklı run farklı set,
  decoy sayısı, cevap anahtarı sıraya oturmuyor), shared-RNG cursor sabit, prep saatinin
  tamamlanmada faturalanması, board-ortası reload, yanlış pin deneme yakıyor, tam/kısmi/sıfır
  sonuç kenarları, stale/çift tık, 6 tamper senaryosu, v16→v17 migration, court+covert reddi.
- Mutasyon kontrolü: yanlış pin bedava bırakılınca test kırmızı ("a decoy costs credibility"),
  geri alınca yeşil.
- `npm run build` yeşil. `npm run test:soak` → **replay 336/336 identical, integrity 0**.
- Tarayıcı (gerçek tıklamalarla tam tur): board açıldı, decoy pin `ATTEMPTS LEFT 3/4` yaptı, üç
  doğru eşleşme `THE CHART HOLDS 3/3` verdi, BACK TO THE FILE sonrası 8h→6.5h, +10 FATIGUE,
  `covertEdge=15`, prep seçeneği dosyadan düştü, dosya masaya döndü. Mobil genişlikte sütunlar
  alt alta yığıldı, yatay taşma yok (`scrollWidth === innerWidth`), kart yüksekliği 48px.
  Konsolda yalnız önceden de var olan dev-server CSP uyarıları.

### Soak notu

Headless botlar aksiyon seçeneklerini bilinçli olarak ellemiyor (mevcut kural: interaktif board'lar
kendi deterministik regresyon testleriyle kapsanır). Contradiction gönüllü bir seçenek olduğu için
soak'ta hiç açılmıyor; yorum bunu açıkça söyleyecek şekilde güncellendi. Denge sabiti
değişmediğinden yeni A/B kohortu gerekmedi.

### Sıradaki kesin adım

Kullanıcının onayı ve push'u sonrası sırada **mobil layout + Capacitor** var (onaylı backlog'un
başı): 3 sütun → sekmeli görünüm, 44px dokunma hedefleri, safe-area, `visibilitychange` pause;
sonra Capacitor sarmalama ve iOS'ta localStorage yerine Preferences. Alternatif: Codex listesinden
3. minigame (Document Reconstruction / Shredder Recovery) — ama kullanıcı önce mobili onaylamıştı.

Açık not: safe fiyatlandırmasında `SAFE_HOURS_MULT` 1.75'te duruyor; oyun hissine göre tek sabitle
geri alınabilir.

---

## 2026-08-13 — Claude: cold-entry penalty, timeline rollout, safe-route pricing (v1.9.21)

### Git checkpoint

- Branch: `minigames`, base commit `3f0398a59` (bu oturumda commit atılmadı; kullanıcı kendi
  pushlayacak).
- Dokunulan dosyalar: `src/game/constants.js`, `engine.js`, `state.js`, `casegen.js`,
  `src/components/CasePane.jsx`, `InfoOverlay.jsx`, `minigames/TimelineMinigame.jsx`,
  `scripts/v195-check.mjs`, `scripts/soak-balance.mjs`, `BALANCE_SOAK_REPORT.md`, bu dosya.

### 0 — "GO IN COLD" artık bedelsiz değil

- `TIMELINE_EDGE_DECLINE=-4`: `declineTimelineChallenge()` resume etmeden önce
  `c.timelineEdge={optionIndex,value:-4}` damgalar. Saat ve FATIGUE alınmaz (kullanıcı kuralı) —
  bedel yalnız şans tarafında ve fail'in −10'undan hafif, yani bulmacayı oynamak hâlâ mantıklı.
- `validTimelineEdge` aralık kontrolünden **tam değer kümesine** geçti (`{+12, −10, −4}`); elle
  yazılmış bir `−7`/`+13` artık reddedilir. Save şeması bu madde için değişmedi.
- Buton metni ve log satırı düşüşü dürüstçe söylüyor.

### 1 — Timeline prosedürel şablonlara yayıldı

Beş şablon artık kendi kronolojisini taşıyor: geç dosyalama (docket), iki versiyonlu rapor
(binder), backdated email (header), patent prior disclosure (prosecution history), noter+eklenmiş
sayfa (guaranty). Her biri 7 olay; **tarihler yalnız dava gövdesinde**, kartlarda yok. Üretilen
isim/rakamlar olay metinlerine de giriyor, dolayısıyla aynı şablon her run'da farklı okunuyor.
Yeni regresyon: beş kimliğin varlığı, `at` sıralaması, kartlarda tarih-yasağı, riskli hamlede
eligibility ve "çözülmüş board dağıtılmaz".

### 2 — Safe rota fiyatlandırması (A + C, ölçümle)

- Kırmızı çizgi korundu: safe hâlâ %100, `chance()` erken dönüşüne dokunulmadı.
- **A (coasting, `S.safeStreak`, schema v16):** ardışık safe çözümlerde INF −1/basamak,
  BOLD −2/basamak, cap 4; herhangi bir riskli hamle sıfırlar; errand/favor sayılmaz.
- **C:** `SAFE_HOURS_MULT` 1.5 → **1.75**.
- 64 seed × 5 senaryo × 4 politika paired kohortlar: A tek başına normal kariyerleri hiç
  değiştirmiyor ama "hep sessizce kapat" kariyerinin INF'ini %32 düşürüyor; C=2.0 ise 13–22 win
  puanı yakan gizli bir global zorluk artışı olduğu için REDDEDİLDİ. Ayrıntı ve tablo
  `BALANCE_SOAK_REPORT.md` v19.21 bölümünde. Soak'a `safe_legacy` kontrol variant'ı eklendi.
- UI: CasePane safe seçeneğinde canlı `COASTING: -n INF, -n BOLD` etiketi, DESK ipucu ve Info
  paneli güncellendi.

### Testler

- `npm test` yeşil. Yeni bloklar: decline cezası (saat/FATIGUE yok + −4 damgası + log), edge
  değer-kümesi tamper'ları, prosedürel timeline içerik invariantları, coasting (ilk safe bedava,
  ikincisi INF/BOLD yakıyor, risk sıfırlıyor, errand saymıyor), `safeHoursMult` kaldıracı,
  v15→v16 migration ve cap üstü streak reddi.
- Mutasyon kontrolü: `coastFx` etkisiz bırakılınca test kırmızı, geri alınca yeşil — assertion'lar
  gerçekten ısırıyor.
- `npm run build` yeşil. `npm run test:soak` → replay 314/314, integrity 0. A/B koşuları:
  413/413 ve 203/203 replay birebir, integrity 0.
- Tarayıcı: safe seçenek `3.5h` (1.75×) gösteriyor, ikinci ardışık safe'te `COASTING: -1 INF,
  -2 BOLD` etiketi çıkıyor, timeline modalında `GO IN COLD (no hour spent · -4% on this play)`
  ve tıklayınca log `You go in cold... (-4% on this play)` yazıp davayı aynı akışta çözüyor.
  Konsolda yalnız dev-server CSP uyarıları (önceden de vardı).

### Sıradaki kesin adım

Kullanıcının onayı ve push'u sonrası: **ikinci minigame — Contradiction Board** (Codex listesinde
2. sıra): ifade ile belgeyi eşleyip sınırlı denemeyle çelişki bulma. Timeline sözleşmesi birebir
uygulanacak — ipucu dava metninde, otomatik zafer yok, saat/FATIGUE her iki sonuçta ödenir,
board deterministik ve save/reload sürebilir, 44px dokunma hedefi.

Açık kalan not: safe fiyatlandırmasında C kaldıracı 1.75'te bırakıldı. Kullanıcı oyunu deneyip
"hâlâ çok kolay/çok sert" derse tek sabit (`SAFE_HOURS_MULT`) geri alınabilir veya
`SAFE_STREAK_*` derinleştirilebilir; ikisi de soak variant'ı olarak duruyor.

---

## 2026-08-13 — Claude: Evidence Timeline vertical slice (v1.9.20)

### Git checkpoint

- Branch: `minigames`, base commit `46adae600` (bu oturumda commit atılmadı; çalışma ağacı kullanıcı
  incelemesi için açık bırakıldı).
- Dokunulan dosyalar: `src/game/constants.js`, `minigames.js`, `content.js`, `engine.js`, `state.js`,
  `src/components/ActionMinigameOverlay.jsx`, `src/components/minigames/TimelineMinigame.jsx` (yeni),
  `src/styles.css`, `scripts/v195-check.mjs`, `scripts/soak-balance.mjs`.

### Kullanıcının tasarım kararı (önceki slice önerisinden sapma)

Codex'in önerdiği "ayrı COVERT ACTION benzeri seçenek" **reddedildi**. Kullanıcı kararı:

- Timeline ayrı bir seçenek DEĞİL; oyuncu normal 3 seçenekten birini seçtikten sonra **rastgele
  şansla** açılan bir hazırlık penceresi.
- Sonuç davayı doğrudan kazandırmaz/kaybettirmez; **yalnız seçilen hamlenin şansını** oynatır
  (başarı +12, fail −10).
- Fail'de hafif bir ceza olsun (−2 REP). Covert'ın yakalanma cezası (−18/−19 REP) aynen korunur.

### Uygulanan

- **Tetikleme:** `choose()` içinde, latework onayından sonra ve **bribe tahsilatından önce**
  (`TIMELINE_TRIGGER=25%`). Yalnız `!o.safe && !o.action` ve `c.timeline` yazılı dosyalarda.
  Bribe'dan önce olması, prep sonrası aynı hamle resume edilirken paranın iki kez düşmesini engeller.
- **Board:** `createTimelineChallenge` — `hash(runSeed|caseId|timelineId)` kimliğinden deal; 7 olayluk
  havuzdan 4 (rank ≥2'de 5) çekilir, deterministik Fisher–Yates ile karıştırılır ve **çözülmüş
  açılmaz**. Paylaşılan `rand()` akışı tüketilmez (yalnız tetikleme zarı tüketir).
- **Tekrar önleme:** aynı dava farklı run'da farklı alt küme sorar; `c.timelineDone` ile run başına
  tek teklif.
- **Kontrol:** sürükle-bırak yok. Kart başına ▲/▼ butonları (44×44), SUBMIT (48px) ve
  "GO IN COLD" (ücretsiz reddet). Klavye/fare/dokunmatik aynı yolu kullanır.
- **Maliyet:** kabul edilirse 0.5h + 3 FATIGUE (ENDURANCE'a tabi), başarı/başarısızlık fark etmez.
  Reddetmek bedelsizdir. Prep bittiğinde commit edilen hamle `choose(...,timelinePrepped=true)` ile
  aynı akışta çözülür; sent-home olursa çözülmez.
- **Edge kapsamı:** `c.timelineEdge={optionIndex,value}` — yalnız hazırlanan seçeneğe uygulanır,
  aynı dosyadaki diğer seçeneklere sızmaz.
- **İçerik:** Vance deposition prep dosyası, 7 tarihli olayı **gövde metnine** taşıyacak şekilde
  yeniden yazıldı; kartlarda tarih YOK — sıra yalnız dosyayı okuyandan çıkar.
- **Save schema v15:** `migrateV14ToV15` sayaçları backfill eder ve legacy dosyalardaki yarım
  timeline işaretlerini temizler. `validTimelineChallenge` + hydrate bütünlüğü board'u kimlikten
  yeniden türetip karşılaştırır (sahte kazanç, küçültülmüş board, yeniden yazılmış çözüm, sahipsiz
  marker reddedilir). Uygulama challenge açıkken tamamen modal olduğundan rank — ve board boyu —
  begin/complete arasında değişemez; doğrulama bunu kullanır.
- **Soak botu:** `S.actionChallenge` dalı eklendi (policy RNG ile %50 reddet / %50 oyna, oynarsa
  %50 doğru sırala). Oyun RNG'si etkilenmez.

### Testler

- `npm test` → yeşil (yeni blok: deal determinizmi, çözülmüş-açılmama, mid-puzzle reload, stale
  double-click, tamper × 5, v14→v15 migration, edge kapsamı, decline maliyetsizliği, DAILY cursor).
- `npm run build` → yeşil. `npm run test:soak` → **replay 334/334 identical, integrity failures 0**
  (ilk koşuda 102 integrity hatası çıktı: soak botu modal'ı tanımıyordu, üç ardışık no-progress
  aksiyonuna düşüyordu — bot dalı eklenince sıfırlandı).
- Manuel: mobil ölçüm (351px dialog ≈ 375px telefon) — yatay taşma yok, ▲/▼ tam 44×44, metin sarıyor.
  Gerçek UI tıklamalarıyla tam tur: solve → "THE CHRONOLOGY HOLDS" → GO IN → 0.5h+2.5h düşüldü,
  `+12%` loglandı, dava aynı akışta çözüldü. Konsol hatasız.
  Not: tarayıcı paneli 644px CSS altına inmiyor; 375px doğrulaması ölçüm yoluyla yapıldı.

### Sıradaki kesin adım

Kullanıcı slice'ı onayladı ve `feat: add evidence timeline case prep` ile `origin/minigames`'e
pushladı (kesin hash için `git log origin/minigames --oneline -3`). Kullanıcıyla mutabık kalınan
sıradaki tur — **0 önce, sonra 1 + 2 birlikte**:

0. **Bulmacayı atlamak artık bedelsiz OLMAMALI** (kullanıcı kararı, 2026-08-13, oyunu denedikten
   sonra). Şu an `declineTimelineChallenge()` hiçbir şey değiştirmiyor: saat/FATIGUE yok, edge yok.
   İstenen: **"GO IN COLD" seçilirse o hamlenin şansı biraz düşsün** (öneri: `TIMELINE_EDGE_DECLINE
   = -4`; hazırlıksız girmenin bedeli, fail'in −10'undan hafif olmalı ki oynamak hâlâ mantıklı
   kalsın). Saat/FATIGUE maliyeti yine alınmamalı — bedel yalnız şans tarafında.
   Dokunulacak yerler: `constants.js` (yeni sabit), `engine.js` → `declineTimelineChallenge()`
   (`c.timelineEdge={optionIndex,value:TIMELINE_EDGE_DECLINE}` yazıp öyle resume et) ve
   `validTimelineEdge` alt sınırı, `TimelineMinigame.jsx` buton metni ("GO IN COLD (no prep, no
   cost)" → şans düşüşünü dürüstçe söylemeli), `scripts/v195-check.mjs` içindeki
   *"Declining is free"* testi (artık "ücretsiz ama şansı düşürür" olarak güncellenmeli).

1. **`timeline` verisini prosedürel şablonlara yay** — `casegen.js` içinde tarih mantığı zaten olan
   şablonlar: backdated email, patent prior disclosure, expired notary. Şu an özellik yalnız tek el
   yazması davada (`depo`) ve %25 tetiklemeyle duruyor; çoğu run'da hiç görünmüyor. Altyapı hazır,
   bu saf içerik işi: her şablona 6-7 olayluk havuz + gövde metnine gömülü tarihler. Üretilen
   isim/tarih/rakam her seferinde değiştiği için içerik tekrarı asıl burada kırılır.
2. **Safe %100 dengesi** (aşağıdaki kullanıcı notu) — aynı turda ölçülebilir: `soak` çıktısı stil
   dağılımını ve win oranını zaten raporluyor, değişiklik öncesi/sonrası aynı seed matrisiyle
   karşılaştırılmalı. Denge sabiti değişirse `BALANCE_SOAK_REPORT.md`'ye paired kohort eklenir.

Ondan sonra: ikinci minigame seçimi (Codex listesinde **Contradiction Board** 2. sırada).

### Kullanıcı notu — sonraki denge işi

**Safe seçeneklerin %100 olması dengeyi bozuyor** (kullanıcı gözlemi, 2026-08-13). Bu turda
dokunulmadı. Ele alınırken: `chance()` içindeki `o.base>=100` erken dönüşü, GDD'deki
"safe asla fail etmez" sözleşmesi ve `validOption`'ın `base>=100` kabulü birlikte değerlendirilmeli;
alternatif olarak safe'in bedeli şans yerine saat/BOLD/deadline tarafında artırılabilir.

---

## 2026-08-13 — Codex handoff to Claude

### Git checkpoint

- Branch: `minigames`
- Commit: `46adae600 feat: add power cut progression and fraud pressure`
- Remote: `origin/minigames` aynı commit'e pushlandı.
- Bu kayıt oluşturulmadan hemen önce çalışma ağacı temizdi.

### Tamamlanan son büyük işler

- Redvale **Lockpick** COVERT ACTION + başarısızlık sonrası deterministik **Coin Call**.
- Aldergate/NimbusHost **Power Cut**: üç dönen halka, tek hata sonrası Coin Call.
- XP/8 level ve iki skill: **SNEAKY** + **ENDURANCE**.
- Fraud senaryosu için FATIGUE peak tabanlı slip, cover kararı ve üç aşamalı kimlik baskısı.
- Save schema v14, eski aktif puzzle kayıtları için migration/grandfathering ve strict tamper
  doğrulaması.
- Fraud sabah yüzleşmesi pasiflerden önce açılır; seçimden sonra sabah akışı reload-safe ve
  exact-once devam eder.
- Son doğrulama: `npm test`, `npm run build`, `npm run test:soak` yeşil; full soak 720 kariyer,
  replay 348/348, integrity failure 0. Saf Aggressive politikası Standard senaryolarda %0 win.

### Mevcut minigame sözleşmesi

- Minigame nadir ve dosyanın bağlamına özel çıkmalı.
- Çözüm için gereken ipucu dava metninde bulunmalı; gerçekten okumayı ödüllendirmeli.
- Başarı otomatik dava zaferi vermemeli; evidence edge, dossier veya teknik seçenek bonusu vermeli.
- Saat ve FATIGUE maliyeti başarı/başarısızlıkta ödenmeli.
- Fail sonucu açık ve sınırlı olmalı; saf agresif spam için kestirme oluşturmamalı.
- Board ve outcome deterministik olmalı; save/reload sonucu veya bulmacayı değiştirmemeli.
- Klavye, mouse ve dokunmatik desteklenmeli; mobil hedef en az 44px olmalı.
- UI animasyonu global store'u her frame notify ederek bütün uygulamayı render etmemeli.

### Kullanıcının onayladığı yeni yön

Bağlamsal minigame hattına devam edilecek. Öncelik sırası için mevcut öneri:

1. **Evidence Timeline** — e-posta, imza ve ödeme olaylarını dava metnine göre kronolojik sıraya
   dizme. En güçlü ilk aday; oyunun okuma/dosya inceleme çekirdeğini doğrudan güçlendirir.
2. **Contradiction Board** — ifade-belge eşleştirip sınırlı denemeyle çelişki bulma.
3. **Document Reconstruction / Shredder Recovery** — belge parçalarını mantıksal olarak birleştirme.
4. **Metadata Trace** — versiyon düğümlerinden sahte değişiklik kaynağını izleme.
5. **Redaction Check** — gönderim öncesi riskli isim/tarih/gizli satırları bulma.
6. **Deposition Trap** — soruları doğru hazırlık sırasıyla yöneltme.
7. **Security Camera Route** — kamera görüşleri arasında stratejik zamanlama.

### Sıradaki kesin adım

**Evidence Timeline vertical slice tasarla ve uygula.** Henüz bu özellik için kod yazılmadı.

Önerilen ilk slice:

- Tek bir el yazması dosyada, metinde açıkça bulunan 4 olaylık kronoloji.
- Dosya seçeneği üzerinden açılan ayrı action challenge; başlangıçta saat/FATIGUE maliyeti commit edilir.
- Sürükle-bırak tek kontrol olmamalı: seçilebilir kartlar + yukarı/aşağı düğmeleri veya numaralı
  klavye akışı dokunmatik/klavye erişimini birlikte sağlamalı.
- Submit öncesi sıra değiştirilebilir; submit sonrası deterministic success/fail.
- Başarı yalnız `evidenceEdge`/technical bonus versin; fail dosyayı masada bıraksın veya sınırlı
  bir sonuç üretsin, doğrudan game over olmasın.
- Aktif challenge save snapshot'ı case/action kimliği, canonical event listesi, current order,
  submit durumu ve skill/rules version içermeli; validator canonical board'u yeniden türetmeli.
- Yeni schema gerekiyorsa migration + mid-puzzle reload + tamper + stale-click + DAILY RNG testleri
  aynı değişiklikte gelmeli.
- Uygulama sonunda `npm test`, `npm run build`, `npm run test:soak` ve mobil viewport manuel testi.

### Daha sonra

- Evidence Timeline sonrası kullanıcıyla ikinci minigame seçimi netleştirilecek.
- Daha önce onaylı mobil layout + Capacitor işi iptal edilmedi; bağlamsal minigame hattından sonra
  backlog'da duruyor.
- Ardından bağlamsal SFX, GitHub Pages demo ve Steam paketleme adayları var.

