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

## 2026-09-03 — Claude: Steam hazırlık turu (v1.9.39)

### Ne yapıldı

Logbook'taki üç maddenin üçü de kapandı.

1. **Versiyon** — `package.json` `0.3.0` → `1.9.38` → `1.9.39`. Başka yerde referans yoktu.
2. **Font yerelleştirildi** — `styles.css`'teki Google Fonts `@import`'u gitti. `src/fonts/`
   altında latin (4.7 KB) + latin-ext (3.7 KB) woff2, `@font-face` ile. Lisans `src/fonts/OFL.txt`
   (SIL OFL 1.1, Press Start 2P Project Authors). `index.html` CSP'sinden `fonts.googleapis.com`
   ve `fonts.gstatic.com` çıkarıldı. `font-display:block` seçildi (`swap` değil): monospace
   flash'ı 8px tipografide bütün panelleri reflow ettiriyor.
   Not: latin-ext 4096 byte altında olduğu için Vite onu base64 data URI'ye gömüyor — CSP'de
   `font-src 'self' data:` zaten var, sorun değil.
3. **Save'ler dosyaya taşındı** — Steam Cloud dosya senkronize ediyor, Chromium LevelDB'sini
   edemiyor.
   - `src/game/store.js` — tek adaptör. Tarayıcıda `localStorage`, Electron'da `window.foStore`.
   - `electron/store.js` — anahtar başına bir dosya, `userData/saves` altında. **Electron
     gerektirmeden test edilebilsin diye main.js'ten ayrı tutuldu.**
   - `electron/preload.js` — sandbox'lı, `fs` yok, `contextBridge` + `sendSync`.
   - `engine.js` / `achievements.js` / `settings.js` / `intro.js` → `store.*`.

### Tuzaklar (biri gerçek regresyondu)

1. **`getItem` throw'u yutmak yasak.** İlk sürümde `catch(e){return null}` yazdım; engine
   "storage kapalı" (`unavailable`) ile "slot boş" (`empty`) ayrımını **okumanın throw etmesiyle**
   yapıyor. Test yakaladı. Aynı sebeple dosya deposu da `{ok,data}` döndürüyor: dizin yoksa
   ilk açılış (`ok`), okunamıyorsa arıza (`!ok`) — ikincisinde renderer'da okuma throw eder.
   Aksi halde erişilemeyen save'ler boş görünür ve oyuncu üzerine yazmaya davet edilir.
2. **Yazma atomik**: tmp + rename. Yarıda kalan yazım eski save'i bozmuyor.
3. **Anahtar sanitizasyonu** `^[A-Za-z0-9_.-]{1,120}$` — `../` kaçışı reddediliyor.
4. **`sendSync` bilinçli tercih.** Fire-and-forget olsaydı yazma hatası bildirilemezdi ve
   AUTO-SAVE FAILED bandı sessizce ölürdü. Payload onlarca KB, disk yerel.
5. esbuild ESM bundle'ı CJS `require`'ı desteklemiyordu; `run-v195-check.cjs`'e `createRequire`
   banner'ı eklendi.

### Testler

`npm run build` ✓ · `npm test` ✓ · tarayıcıda font + sıfır Google isteği doğrulandı ·
`npx electron .` temiz açıldı · **uçtan uca smoke**: gerçek `preload.js` → gerçek ipc kanalları
→ gerçek `store.js` (write/read/remove/kötü anahtar) elle çalıştırıldı ve geçti.

Yeni kalıcı guard'lar: CSP ve stylesheet'te uzak host yok, `styles.css`'in gösterdiği her woff2
repoda **var mı** diye kontrol ediliyor, persist eden her modül `store.js`'ten geçiyor, dosya
deposu round-trip/atomik/kötü-anahtar/eksik-dizin davranışları. **Üçünü de bilerek kırıp
gerçekten fail ettiklerini doğruladım** — ilk font guard'ı ikinci `@font-face` yüzünden
ısırmıyordu, dosya varlığı kontrolüne çevrildi.

### Sıradaki kesin adım

Kullanıcı mobil-mi-Steam-mi diye sordu; cevap turun sonunda verildi. Teknik olarak bu turun
üçü de **her iki hedefe** yarıyor (Capacitor da yerel font ve dosya tabanlı depolama ister).

Sırada: DEV panelinin paketlenmiş build'de kapalı olduğunu doğrulamak, `electron-builder`
(ikonlar `assets/logo/` altında hazır), gerçek Windows testi (v1.9.3 donma düzeltmesi hâlâ
doğrulanmadı), `steamworks.js`. Onaylı backlog: mobil layout + Capacitor, GitHub Pages demo.

---

## 2026-09-03 — Claude: logo (v1.9.38)

### Karar

Kullanıcı sekiz tur tasarım sonrası **"THROUGH THE C"**'yi seçti: takım gövdesi + göğüs cebinde
**dik duran** dosya, saat yönünde çeyrek tur döndürülmüş, isim boyunca aşağı akıyor, cep çizgisi
FANCY'nin **C'sinin tam ortasından** kesiyor → `FANC / OUTF`. Marka ismi asla hecelemiyor;
tasarımın amacı bu, o yüzden isim her zaman yanına yazılır.

Kesim derinliği zevkle değil **harf formuyla** sınırlı: bir tık daha derin gidince C dikleşip
I'ya dönüşüyor. Nokta ölçümle bulundu — Press Start 2P'de mürekkep em kutusunu doldurmadığı için
"4. karakterin yarısı" 3.5 değil **3.6** çıktı.

### Ne var

- **`src/game/logo.js`** — saf builder, düz rect listesi döndürür (`OfficeScene`'in `buildScene`
  kalıbı). React import etmez. **Tek kaynak budur.**
- **`src/components/Logo.jsx`** — listeyi `<rect>`'lere map'ler, başka bir şey yapmaz.
- **`scripts/build-logo.mjs`** — `assets/logo/` altındaki SVG'leri **aynı builder'dan** yazar.
  Diskteki dosya oyunun çizdiğinden ayrışamaz.
- **`assets/logo/`** — 3 SVG + 18 PNG + `.ico` + `.icns` + kendi README'si.
- **Başlık ekranı** — `.titlerow`: yazısız marka solda (104px, ≤600px'te 72px, `--panel2`
  kenarlıklı), isim ve alt başlık sağda.

### Kurallar / tuzaklar

1. **Yazı font çağrısı DEĞİL.** Press Start 2P bir kez 7×7 mürekkep ızgarasına (8 birim advance)
   örneklenip builder'a donduruldu. Canlı `<text>` kullanırsan ikame edilen bir font kesimi
   C'nin ortasından kaydırır — markanın kaldıramayacağı tek şey bu. Fontsuz render doğrulandı.
2. **90° dönüş transform değil, koordinata pişirilmiş** (`turn()`), böylece çıktı düz rect
   listesi kalıyor ve hem React hem script aynı sayıları kullanıyor.
3. **`assets/` "asset dosyası ekleme" kuralını delmiyor**: SVG'ler üretiliyor, elle çizilmiyor —
   `sound.js` seslerini nasıl sentezliyorsa öyle. `.ico`/`.icns` bilinçli istisna; rasterizer ve
   `iconutil` gerektiriyor, her makinede yok.
4. **~226px altında yazı çözünmüyor** (glyph pikseli 0.425 birim). Küçük boyutlarda yazısız
   varyant kullanılır, isim markanın yanına yazılır.
5. **Çerçeveli ikon**: bizim olmayan zeminler için. Onay turundaki render'da altta koyu bir bant
   vardı; sebebi `clip-path`'in grubun transform'undan sonra uygulanmasıydı (yanlış uzayda
   kırpma). Kod sürümü doğru kırpıyor, takım çerçevenin iç kenarına kadar doluyor — küçük
   boyutta biraz daha iyi. Kullanıcıya bildirildi, bant istenirse geri konabilir.

### Testler

`npm run build` ✓ · `npm test` ✓ (v1.9.5–v1.9.25 zinciri, değişiklik yok) · konsol hatası yok ·
1280px ve 380px'te tarayıcıda göz kontrolü ✓ · builder çıktısı onaylanan master'la **pixel
identical** (mark ve çerçevesiz ikon; ilk turda eksik ceket düğmesi bu karşılaştırmayla yakalandı).

### Sıradaki kesin adım

Steam hazırlığı, bu sırayla — üçü de oyuncuya görünmez ama yayında baş ağrıtır:

1. **Versiyon birliği** — `package.json` hâlâ `0.3.0`, oyun v1.9.38. Electron ve Steam bunu okur.
2. **Fontu yerelleştirmek** — `Press Start 2P` hâlâ Google Fonts `@import`'u. Logo artık bağlı
   değil ama **arayüzün tamamı bağlı**; internetsiz Electron build'inde monospace'e düşer.
3. **Save'leri dosyaya taşımak** — `localStorage` Steam Cloud ile senkronize olmuyor.

Sonra: DEV panelinin paketlenmiş build'de kapalı olduğunu doğrulamak, `electron-builder`
(ikonlar hazır), gerçek Windows testi (v1.9.3 donma düzeltmesi hâlâ doğrulanmadı),
`steamworks.js`. Onaylı backlog: mobil layout + Capacitor, GitHub Pages demo.

---

## 2026-08-22 — Claude: DEV panel (v1.9.28)

### Karar

Kullanıcı "developer bölümü" istedi, "GitHub'a pushlamayalım" dedi. Sordum, seçim:
**repo'da dursun ama yalnız dev'de çalışsın.** Yani kod pushlanır, `npm run build` çıktısında
hiç yer almaz — oyuncuya, Pages demosuna, itch'e ve Steam'e asla gitmez. Alternatifler (gitignore
ya da ayrı yerel dal) reddedildi: yedeklenmez, refactor'da sessizce bozulur, test koruyamaz.

### Ne var

`` ` `` tuşu paneli açar/kapatır (yalnız dev). İçinde:

- **Boards:** her board tek tıkla açılır — kilit açma SNEAKY 0/2/5 ile ayrı ayrı, sabotaj,
  kronoloji, çelişki, itiraz, redaksiyon, ve yazı-tura **istenen yüzle** (heads/tails).
- **El yazması dosyalar:** 11 davanın hepsi tier etiketiyle, tek tıkla masaya.
- **Prosedürel şablonlar:** 1-18 arası istediğin şablonu doğrudan üretir (`genCaseFrom`).
- **Statlar:** rep/bold/inf/firm/money/fatigue/hours/rank/day/sneaky canlı düzenlenir.
- **Reveal:** açık board'un gizlediği değerleri döker — kilidin `give`/`breakAt`/`hintLead`'i,
  kronolojinin doğru sırası, redaksiyonun imtiyazlı sayfaları, itirazın hatalı soruları,
  sabotajın halka hedefleri. Efektleri gerçeğe karşı yargılayabilmek için.

### Kurallar

- `src/game/devtools.js` **gerçek engine fonksiyonlarını sürer** — hiçbir oyun kuralını yeniden
  yazmaz. Panelde gördüğün, oyuncunun göreceğiyle aynı.
- Board tetikleri için mevcut test-only `setBalanceExperiment` seam'i kullanıldı
  (`objectionTrigger`/`timelineTrigger`); yeni bir üretim mekanizması eklenmedi.
- `casegen.js`'e `genCaseFrom(index)` ve `TEMPLATE_COUNT` eklendi (üretim kodu, zararsız).

### Yolda yakalanan üç kusur

1. **Modal panelin üstüne inert basıyordu.** Board açıkken `ActionMinigameOverlay`'in `inert`
   süpürmesi dev paneli de kilitliyordu — tam ihtiyaç duyulan anda tıklanamıyordu. Süpürme
   seçicisine `:not(.devpanel)` eklendi.
2. **Oyun donuyordu (kullanıcı bildirdi).** Açık bir board varken panelden ikinci bir board'a
   basınca: `devSpawnCase` inbox'ı değiştiriyor, ama `choose()` zaten açık bir challenge varken
   hiçbir şey yapmıyor. Sonuç: ekranda kalan board'un davası inbox'tan kayboluyor, `actionRefs`
   çözemiyor ve tüm tuşlar **sessizce** boşa düşüyor. Düzeltme: `devClearBoard()` — masaya yeni
   dosya koyan her yol önce açık board'u ve `*InProgress` işaretlerini temizliyor. Panele ayrıca
   "Close open board (unstick)" kurtarma düğmesi eklendi. Yedi board arka arkaya açılıp her birinin
   tepki verdiği doğrulandı.
3. **Genişlik yanlış kaydediliyordu.** `pointerup` işleyicisi closure'daki eski genişliği
   yazıyordu; ref'e taşındı. Panel artık sol kenarından sürüklenerek 240-760px arası
   boyutlandırılıyor ve genişlik reload'ı aşıyor (`fo_devpanel_width`). Başlıktaki ↔ sıfırlıyor.

### Açma/kapama

Kullanıcının klavyesinde backtick ölü tuş olduğu için tek kısayol yetersizdi: artık **F9**, sağ
kenardaki görünür **DEV şeridi** ve backtick — üçü de çalışıyor.

### Yeni kalıcı test

`npm test` artık **dev/production sınırını** denetliyor: panelin yalnız `import.meta.env.DEV`
arkasında render edildiğini, hotkey'in yalnız dev'de kurulduğunu, hiçbir sevk edilen modülün
`devtools.js`'i import etmediğini ve devtools'un gerçek engine'i sürdüğünü zorunlu kılıyor.
Ayrıca build çıktısı elle de doğrulandı: `devOpenBoard`, `DEV_TEMPLATE_COUNT`, panel metinleri —
hiçbiri `dist/`te yok.

### Testler

`npm test` yeşil, `npm run build` yeşil, `npm run test:soak` → replay 329/329, integrity 0.
Tarayıcıda panel açıldı, SNEAKY 5 ile kilit board'u açıldı (3 pik), reveal gizli değerleri döktü.

---

## 2026-08-28 (2) — Claude: tekrar taraması ve en görünür tekrarın kaldırılması (v1.9.37)

Kullanıcı "oyuncular sıkılır mı, çok tekrar var mı" diye sordu. Tahmin yerine sayıldı.

### Ölçüm: nerede tekrar VAR, nerede YOK

| içerik | havuz | kariyerde | değerlendirme |
|---|---|---|---|
| el yazması dava | 17 | her biri 1 kez | sorun yok |
| prosedürel dava | 24 şablon | ~2.1 kez | tür için normalin üstünde |
| kriz | 8 | `usedCrises` her birini 1 kez işaretliyor | tekrar imkânsız |
| duruşma | 8 salon + üretilen | — | bu turda zaten çözülmüştü |
| **favor** | **1 şablon / 3 seçenek** | **~10 kez** | **oyundaki en tekrarlı şey, farkla** |
| hafta sonu kartı | 3 | ~5 kez | her biri ~1.7 kez |
| NPC hikâyesi | 4 yazılmış | ~1 açılıyor | yazılanın dörtte üçü hiç görülmüyor |

30 günlük bir kariyerde okuduğun dava metinlerinin **%25'i tamamen benzersiz**, gerisi
varyasyon. Sıkılma riski mekanikte değildi — her sabah karşına çıkan favor kartındaydı.

### 1. Favor: 3 seçenek → 12

Her meslektaşın artık **kendi seçenekleri** var, çünkü Dana'ya yardım etmekle Harold'a
yardım etmek aynı şey değil: Dana ketumlukla, Raquel krediyle, Harold onuruyla, Katrina
kozla iş yapıyor. Gövde de 4→12 (her NPC için üç ayrı istek, güne göre dönüyor).

Ölçüm: **12 gövde, 12 farklı seçenek** (önce 4 ve 3).

**Ve bir tuzak:** ilk sürümde hem favor hem hafta sonu seçeneklerine
`style:"technical"/"aggressive"` yazmıştım. Soak %66.6 → **%61.3**'e düştü. Sebep denge
değildi: **favor bir angarya, cumartesi bir gün — ikisi de hukuki hamle değil** — ama stil
etiketi verince stile göre karar veren her sistem (coasting, hakim hafızası, politika
botları) ayak işini dava sanmaya başladı. İki dosyadan da kaldırıldı, `boldW` kaldı ve
**kalıcı regresyon** artık hiçbir favor/hafta sonu seçeneğinin bu etiketleri taşımamasını
zorluyor (bozulunca kırıldığı doğrulandı).

### 2. Yazılmış ama görülmeyen içerik — ve bedeli

NPC hikâye eşiği **40'tı**. Favor +10 veriyor ve kariyerde bir NPC'ye ~2.5 kez düşüyor —
yani favorla ulaşılabilecek tavan **+25**. Dört sahne yazılmış, biri açılıyordu.

Ama eşiği düşürmek bedava DEĞİL: her ek sahne, riskli kolu olan bir event daha demek.
Aynı seed'lerle eşleştirilmiş ölçüm:

| STORY_AT | kazanma | kovulma |
|---|---|---|
| 40 (eski) | %66.9 | %9.1 |
| 25 (ilk deneme) | **%62.5** | %10.3 |
| **30 (seçilen)** | **%66.6** | **%9.7** |

**30** seçildi: içeriği bir-iki meslektaşa açıyor ama "herkese yardım et"i zorluk ayarına
çevirmiyor. Regresyon hem alt hem üst sınırı favor ödülünden türetiyor — ödül değişirse
test kırılır.

### 3. Hafta sonu: 3 sabit kart → 6'dan 3

Altı kart havuzu, üçü dağıtılıyor ve **dinlenme seçeneği her zaman içeride** (dinlenilemeyen
bir hafta sonu seçim değil, program). Yeni kartlar farklı yönlere çekiyor: akşam yemeği
(dinlenme+REP), baro kokteyli (INF), "normalde hayır diyeceğin şeye evet de" (kumar).
Ölçüm: 1 kombinasyon → **20**.

### Son ölçüm

Tam matris (320 kariyer): **%66.6 kazanma, medyan gün 20, integrity 0** — bu batch
öncesiyle aynı bant. Daha çok içerik, aynı zorluk.

### Testler

`npm test` yeşil — yeni blok favor gövde/seçenek çeşitliliğini, her seçenekte yardımın
artı ve reddin eksi olmasını, hikâye eşiğinin favorla ulaşılabilirliğini ve hafta sonunun
her zaman dinlenilebilir olmasını zorluyor. Guard'ın bozulunca kırıldığı doğrulandı
(seçenekler tek sete indirilince "helping one colleague is not the same act" düştü).

---

## 2026-08-28 — Claude: oynanış geri bildirimi — uzlaşma, ezber, gerekçe kartı (v1.9.36)

Kullanıcının ilk gerçek playtest'inden gelen maddeler.

### 1. Uzlaşma teklifi — iki ayrı hata

**"Reddetmeme rağmen birden fazla geldi"** ve **"ilk itirazı yanlış yapsam bile teklif
ettiler."** İkisi de doğruydu ama sebepleri farklıydı:

- `offerFloor = jury+12` reddedişten sonra kapıyı yeniden açıyordu. Jüri yükselmeye devam
  ederse üç kez teklif gelebiliyordu. Artık **`offerUsed`: bir teklif, ret kesin.**
- Eşik mutlaktı (58), o yüzden **güçlü bir dosyada iyi bir açılış zaten eşiği aşıyordu** —
  yani teklif, oyuncunun yaptığı bir şeyin değil dosyanın ödülü gibi okunuyordu. Artık
  eşik `max(OFFER_AT, açılış+8)`: karşı taraf ancak **sen davayı ilerlettiysen** gözünü
  kırpıyor. Zayıf dosya daha yüksek bir bara tutulmuyor.

Corvid ve Ravenscroft'un gücü de 13/11 → **9/8**'e çekildi. Ölçüm (aynı seed):
iyi oyun 70-85, kötü oyun 10-32, teklif iyi oyunda 1 / kötü oyunda 0.

### 2. "Her duruşmada karşı taraf aynı şeyleri soruyor"

Haklıydı: el yazması duruşmaların çapraz sorguları sabitti. Artık her karşı-taraf fazı
**üç satırlık bir havuz** taşıyor ve hangisini gördüğün `runSeed|dava|duruşma|faz`
kimliğinden geliyor. Üretilen havuz da 11→19 satıra çıktı.

**Ve bir hata daha:** ilk sürüm `hash()` ile seçiyordu — `hash` çıktısı girdiyle ~1
oynadığı için 40 run'da sadece 3 farklı sorgu çıktı. Board'ların v1.9.30'da öğrendiği
dersin aynısı. `utils.mixKey()` eklendi (avalanche); artık 9 kombinasyonun 9'u da
erişilebilir ve regresyon bunu sayıyor.

### 3. İtiraz gerekçeleri kartı

Duruşma ekranının sağ üstünde **i** butonu: sekiz gerekçe ve her biri için tek satırlık
"ne zaman kullanılır" testi. Ezberlenecek bir menü değil, kontrol edilecek bir sözlük.

### 4. Duruşma başlangıcında özet

İlk fazda tek satırlık briefing: hangi hakim, kaç aşama, ve "jürinin nereye yaslandığını
kimse sana söylemeyecek". El yazması duruşmalar kendi `brief`'ini taşıyabilir.

### 5. Klavye

Davalarda 1-4 zaten vardı; duruşmaya taşındı. Argümanlarda **1-4**, gerekçelerde **1-8**,
susmak için **0/Space**, uzlaşmada **1/2**, hükümde **Space**. Ekranda numaralar görünüyor.

### 6. Golf ne işe yaradı

Görünmüyordu. Artık her bilinçli yaklaşım (golf, rüşvet) sonucu söylüyor:
"Hon. D. Crane Jr. now regards you as WARM." THE BENCH panelinde her bant ne satın
aldığını yazıyor.

### 7. DEV paneli

Sekiz duruşmanın hepsi ayrı buton (Corvid ve Ravenscroft'a bakılamıyordu).
`devOpenBarLetter` artık eksik `barHeat`'i kuruyor ve açık her şeyi temizliyor.

### Ayrıca: dördüncü tarih-kayması hatası

`npm test` HEAD'de kırıktı — benim değişikliklerimden değil. "Declining adds no prep
fatigue" kontrolü tavanı `cost*2` sanıyordu, ama technical hamlelerin ek yorgunluğu var;
dünkü DAILY senaryosu (ENDURANCE'lı debtor) bunu tesadüfen örtüyordu, bugünkü (legacy)
örtmedi. Artık **kontrol grubu ölçülüyor**: kronolojisi olmayan aynı hamle. Bu sürüm
kayamaz çünkü karşılaştırdığı şeyi ölçüyor.

### Testler

`npm test` yeşil (yeni: tek teklif, kazanılmış teklif kuralı, dokuz kombinasyonun
erişilebilirliği, gerekçe kartı içeriği — üçü kasten bozulup kırıldığı doğrulandı).
`npm run build` yeşil. `npm run test:soak` 348/348, integrity 0.

### Cevaplar

- **Klavye mantıklı mı?** Zaten vardı (v1.1, davalar ve krizler için); eksik olan duruşmaydı, eklendi.
- **Kaydedip çıkma?** v1.9.31'de eklenmişti — **SET → SAVE & QUIT TO TITLE**. IRONMAN'de yok (kaydı yok).

---

## 2026-08-27 (3) — Claude: dava havuzu — DURUŞMA tur 3/3 (v1.9.35)

Duruşmanın son turu: içerik. Duruşma iki el yazması salonla çıkmıştı, yani bir kariyer
hep aynı iki jüriyi görüyordu.

### Altı yeni el yazması mahkeme davası

`court3`-`court8`, her biri **kendi duruşma metniyle** (4-6 aşama, kendi gücü, kendi
hükmü). Hepsinde kararı veren bir ipucu metnin içinde saklı:

- **Bellwether Freight** — kamyonun telemetrisi hiç hareket etmediğini söylüyor, defter
  Ohio diyor; sevkiyatçının SMS'i "log it as done, sort it Monday".
- **Ravenscroft Bio** — patentin sahibi olduğu yöntemi kendi baş bilimcisi bir ay önce
  konferansta anlatmış. Kendi ifşası yeniliği öldürür.
- **Estate of Almeida** — şubatta imza atamayan kadın nisanda tapu devretmiş; bakım
  kaydında o gün "ziyaretçi yok" yazıyor.
- **Kepler Tower** — on yıllık tertemiz denetim kaydı, ama denetçinin faturaları 18 ay
  önce kesilmiş ve son dört sayfa başka bir fontta.
- **Sable & Roe** — deede eklenmiş, ikisinin de paraf attığı ek; Roe'nun kendi mesajı
  "fine, your clients, my building".
- **Corvid Media** — 11 milyonluk hakaret davası doksan sayfa boyunca ifadenin **yanlış
  olduğunu bir kez bile iddia etmiyor**; iç yazışmada "a cost exercise" deniyor.

### Altı yeni prosedürel şablon (18 → 24)

Eşin tanıklık ettiği kefalet, işten çıkarılan çalışanın rekabet yasağı, azınlık hissedar
tasfiyesi, sonuca bağlı ücretli bilirkişi, sigorta bildirim süresi, ve **var olmayan
içtihat gösteren AI-yazımı dilekçe**.

### Üretilen duruşmalar

`buildTrial` (casegen) artık HER mahkeme dosyasına duruşma kuruyor — açılış/argüman/
kapanış havuzları + 11 satırlık karşı taraf havuzu, hepsi dosyanın kendi isim ve
belgelerinden. 4 veya 6 aşama. Ödül ve ceza dosyanın kendi bahsinden türetiliyor.

### Test gerçek bir içerik hatası buldu

Üretilen bir aşamada **hiç "güçlü" seçenek çıkmayabiliyordu** — yani ne seçersen seç
jüriyi kaybediyordun. Oynanamayan bir tur seçim değil, o aşamaya gelmiş olmanın vergisi.
`opts()` artık her zaman bir güçlü satır dağıtıp sırayı karıştırıyor; regresyon bunu
zorluyor ve guard bozulunca kırılıyor.

### Ölçüm

| | önce | sonra |
|---|---|---|
| el yazması dava | 11 | **17** |
| prosedürel şablon | 18 | **24** |
| duruşmaya gidebilen el yazması salon | 2 | **8** |
| 67 dosyalık kariyerde aynı şablonun tekrarı | 3.7 | **2.8** |

Soak: **%66.6, medyan gün 20, integrity 0** — bant içinde (65-70). Daha çok içerik, aynı
zorluk.

### Sıradaki kesin adım

Kullanıcı üç turu birden oynayacak. Sonra **GitHub Pages demo**, ardından
**mobil layout + Capacitor**.

---

## 2026-08-27 (2) — Claude: THE BENCH — hakim ilişkileri, traitler, golf, rüşvet (v1.9.34)

Duruşmanın 2. turu. Tur 3 havuz genişlemesi (6 el yazması + 6 şablon).

### İlişki neden `judgeMemory`'ye girmedi

`judgeMemory` "bu hakim seni ne yaparken gördü"yü tutuyor ve **her kaydın arkasında en az
bir duruşma olmak zorunda** (`seen > 0` invariantı, sıkı doğrulaması var). Oysa hiç
görmediğin bir hakimle golf oynayabilirsin. İkisini birleştirmek, yeni bir özelliğe yer
açmak için çalışan bir invariantı gevşetmek olurdu. Ayrı modül: `judges.js`, ayrı store
`S.judgeRel`.

### Traitler ve etkiler

7 hakime isimli trait: **STICKLER** (Ironwood, Whitlock — yersiz itiraz iki kat pahalı),
**PATIENT** (Marsh — yarı), **PEDANT** (Pelt, Okonkwo — teknik argümanı ödüllendirir),
**SHOWMAN** (Crane, Fairway — cüretli argümanı ödüllendirir). Trial seçenekleri
`flavor:"bold"|"technical"` taşıyor, bench ona göre ±2 veriyor.

**İlişki dört yeri de etkiliyor ama hepsinde küçük** (kullanıcının açık isteği; testler
sınırları zorluyor):
- duruşma dışı riskli hamlede en fazla **±4**
- tutan itirazın jüri salınımına en fazla **+2**
- uzlaşma teklifi eşiğini en fazla **6** düşürür
- ve tek gerçek karar değişikliği: **rel ≥ 30 iken**, argüman gerçekten geçersizken yanlış
  gerekçe seçersen hakim senin yerine düzeltiyor ("counsel means something else, and
  counsel is right"). **Tamamen yanılmak asla kurtarılmıyor.**

**Kaynaklar:** tutan itiraz +2, yersiz itiraz −3×trait, hazırlıklı gelmek (kronoloji/
çelişki kenarıyla) +2, o hakimin salonunda patlayan blöf −4. *Zaman israfı cezası
eklenmedi — kullanıcı onu seçmedi.*

### Golf ve rüşvet

Dosyadaki sabit fiyatlı "discuss golf" butonu **kaldırıldı** (test artık hiçbir dosyanın
rüşvet seçeneği taşımadığını zorluyor). İkisi de yeni **THE BENCH** panelinde:

- **Golf:** $600 + 2h, kendi mini-sahnesi. Bıraktırmak +8, dürüst oynamak +14/−4,
  masada iş konuşmak +10/−18. 4 gün cooldown.
- **Rüşvet:** miktarı sen yazıyorsun ($500-$20.000). Şans = `corrupt` tabanı × azalan
  getiri; **corrupt < 20 olan hakim hiçbir fiyata satın alınamıyor** (Ironwood, Pelt,
  Okonkwo), Fairway $20k'da bile %29. Asla strateji değil.
- **Ret pahalı:** para gider, ilişki −60 ve kalıcı `burned`, baro ısısı **iki kez** yazılır.

### Yakalanan hata

`lastGolfDay:0` "hiç oynamadım" demek, ama cooldown onu "0. günde oynadı" sanıyordu —
**kariyerin ilk golf daveti 4. güne kadar kilitliydi.** Tarayıcıda butonun bulunamamasının
sebebi de buydu; regresyon artık 1. günde davet edilebildiğini zorluyor.

### Testler

`npm test` yeşil (ilişki sınırları, rüşvet tavanı/azalan getiri, temiz hakim satın
alınamaz, ret cezası, merhamet kuralı, save doğrulaması, 1. gün golfü — ikisi kasten
bozulup kırıldığı doğrulandı). `npm run build` yeşil. Soak **%65.3, medyan gün 21,
integrity 0** — değişmedi (bot golf oynamıyor, rüşvet vermiyor).

Save schema **v26** + `migrateV25ToV26` (eski kariyerler boş sayfayla başlar).

### Sıradaki kesin adım

**Tur 3: havuz genişlemesi** — 6 yeni el yazması mahkeme davası (her biri kendi duruşma
metniyle) + 6 yeni prosedürel şablon.

---

## 2026-08-27 — Claude: DURUŞMA — tur 1, oynanabilir dilim (v1.9.33)

Kullanıcının en büyük özellik talebi. 16 tasarım sorusu sorulup cevaplandı; bu tur
**iskelet + gizli jüri + okumalı itiraz + 2 el yazması duruşma**. Tur 2 hakim
ilişkileri/traitler/THE BENCH, tur 3 havuz genişlemesi (6+6).

### Çekirdek kural: ekrana hiçbir sayı çıkmıyor

`trial.js` (saf modül, `fraud.js`/`ethics.js` deseni). Jüri ikna oranı SADECE modelde
var; `TrialOverlay.jsx` onu ne yazıyor ne hesaplıyor — regresyon dosyayı tarayıp
`{jury}` ve `verdictChance` geçmediğini zorluyor.

- **Başlangıç dosyanın kendi gücünden** (`strength`): Pemberton +9 (iki tanık gemide),
  Halcyon −4 (jüri önünde teknik argüman zayıf). Dosyayı okumak yine asıl beceri.
- **Salınım:** açılış ±6-8, argüman ±5-7, kapanış ±7-10, tutan itiraz +4, yersiz −3,
  **kaçırılan geçersiz argüman −6**. Tavan 85, taban 10 — jüri hiçbir zaman kesin değil.
- **Geri bildirim yalnız oda:** her karar bir cümle üretiyor ("jüri başkanı bir şey not
  edip altını çiziyor" / "kutuda birisi burnundan nefes veriyor"). Yukarı, aşağı ve nötr
  için ayrı havuzlar.
- **Hüküm = çubuğun kendisi.** İkinci gizli kontrol yok. Ölçüm: iyi oynanan duruşma %75,
  kötü oynanan %10'a çakılıyor.

### Okumalı itiraz

Karşı tarafın argümanı sayfada duruyor; oyuncu **doğru gerekçeyi** 8'li sabit listeden
seçmek zorunda (leading/hearsay/speculation/assumes/argumentative/relevance/compound/asked).
Doğru gerekçe → SUSTAINED. Yanlış gerekçe veya temiz argümana itiraz → OVERRULED.
**Temiz argümana susmak doğru hamledir, bedeli yok** — cezalandırılan tek sessizlik,
geçersiz argümanı kaçırmak. Gerçek zamanlı board duruşma dışında ve ifade almalarda kaldı.

### Uzlaşma

Karşı taraf **bir kez** teklif getiriyor, sadece gerçekten geriye düştüklerinde
(`OFFER_AT`). Reddedersen eşik yükseliyor (`offerFloor = jury+12`) — ilk sürüm her
aşamada tekrar soruyordu, bu hem dramatik anı öldürüyor hem de oyuncuya gizli çubuğu
bedava yoklatıyordu.

### Üç gerçek hata yakalandı

1. **Duruşmayı seçince itiraz board'u açılıyordu** — `choose()` içinde duruşma kontrolü
   board tetiklerinden SONRAydı. Oyuncu aynı anda iki mahkemede oluyordu.
2. **`chance()` duruşma seçeneğine sahte bir oran üretiyordu** (soak 498 integrity hatası).
   Artık covert aksiyonlar gibi `null` dönüyor — göstermeyecek bir sayıyı hesaplamak,
   sızdırmanın ilk adımı.
3. **Soak'un durum anlık görüntüsü duruşmayı hiç görmüyordu**, o yüzden her aşamayı
   "hareketsizlik" sayıyordu. `trial`/`trialResult`/`barHeat` kanonik snapshot'a girdi —
   jüri durumu da replay hash'inin parçası artık.

### Maliyet ve denge

4-6 saat (aşama sayısına göre) + ağır yorgunluk; ortada uzlaşırsan kalan saat sende kalır.
Ödül ×2, ceza ×1.5. Devredilemez. Soak: **%65.3, medyan gün 21, integrity 0** — bot
duruşmayı nadiren seçtiği için mevcut denge değişmedi.

### Sıradaki kesin adım

Kullanıcı **court2 (Pemberton)** ve **court1 (Halcyon)** duruşmalarını oynayacak.
Geri bildirimden sonra **tur 2: hakim ilişkileri + traitler + THE BENCH paneli + golf +
miktar girilen rüşvet**.

---

## 2026-08-26 (4) — Claude: barodan atılma + bağlamsal ses (v1.9.32)

### 1. Barodan atılma — GİZLİ ısı (kullanıcının seçimi)

`ethics.js` (saf modül, `fraud.js` deseninde). `S.barHeat` **hiçbir yerde görünmez** —
regresyon beş bileşen dosyasını tarayıp `barHeat` geçmediğini zorluyor.

**Ne besler:** yakalanmak 24, belge gizleme yaptırımı 15, hakim rüşveti 8 (ödemek suç,
işe yarayıp yaramaması alakasız). Gece 1 azalır — baro unutur, ama ağır unutur.
Pratikte: 4 yakalanma / 6 karartma / 10 rüşvet bir duruşmaya götürür.

**Geri bildirim mektuplardır** (gizli ısıda tek okuma kanalı bu):
GRIEVANCE@26 → COMPLAINT@54 → HEARING@80. Her biri saat/para/REP karşılığı
yatıştırma yolu ve bir kumar sunar; **her aşamada %100'lük bir çıkış var**.
Yalnız üçüncü aşamanın pervasız kolu `DISBARRED` terminaline gider.

**Kritik detay:** ısı hızlı yükselirse aşama atlanmıyor (`Math.min(reached,stage+1)`).
İlk sürüm ORTA mektubu atlıyordu — gizli ısıda bu, sessizce bir uyarıyı silmek demek.
Regresyon bunu zorluyor ve guard'ı bozunca kırmızıya dönüyor.

**Fraud çakışması çözüldü:** Fraud'da baro mektubu HİÇ açılmıyor; ilgi doğrudan
`fraudRisk.suspicion`'a yazılıyor. Sahte diplomanla baronun sana bakması zaten ölümcül —
iki paralel kimlik soruşturması yürütmek yerine mevcut merdiveni hızlandırıyor.

**Test bir açık buldu:** ısının kayıtlı ihlallerden bağımsız olabildiğini fark etti.
Doğrulamaya `heat ≤ ihlallerin üretebileceği maksimum` kuralı eklendi; kurcalanmış bir
kayıt artık hak etmediği bir disiplin duruşmasına giremiyor. Schema v24 + migration
(eski kariyerler temiz başlar — arşivden geriye dönük ihlal türetmek, terminal sonu olan
bir tahmin olurdu).

### 2. Bağlamsal ses

**Oda tonu** (`setRoomTone`, dört oda, aynı döngü başka bir yerden duyuluyor):
`office` normal · `court` duruşma/çelişki board'unda (kesim 750→430, tıslama düşer,
tempo yavaşlar — ayağa kalkınca susan oda) · `afterhours` saat bitince ya da mesaide
(tıslama artar: boş bina, yüksek havalandırma) · `spent` FATIGUE≥75 (kesim 300,
detune 14 — donuk ve hafif akortsuz). Yorgunluk hepsini ezer: o noktada sorun oda değil,
sensin. `App.jsx` her render'da `refreshRoomTone()` çağırıyor — idempotent, oda
değişmediyse hiçbir şey yapmıyor.

**Olay ölçeği:** dosya hükümlerinde `SFX.win(scale)`/`SFX.lose(scale)`; scale rütbe
(%65) + dosya tier'ı (%35). Junior'ın kazanması cıvıltı, Name Partner'ın tier-2
kazanması ekstra oktav; büyük kayıpta zemin çekiliyor (98 Hz). Board tıkırtıları
ölçeklenmiyor — onlar geri bildirim, hüküm değil.

### Testler

`npm test` yeşil (yeni: aşama sıralaması, gizlilik taraması, kurcalama reddi, Fraud
yönlendirmesi — ikisi kasten bozulup kırıldığı doğrulandı).
`npm run build` yeşil. `npm run soak` 320 kariyer: **%65.3 kazanma, medyan gün 21,
integrity 0** — botlar yakalanmadığı/rüşvet vermediği için barodan atılma dengeyi
DEĞİŞTİRMİYOR, ki doğrusu bu: sadece davranışın sonucu.

Tarayıcıda: üç mektup, DISBARRED ekranı ve run ledger'ın başındaki
`BAR FILE: 4× caught inside` satırı doğrulandı. DEV panelinde "Bar letter · 1/2/3".

### Sıradaki kesin adım

**GitHub Pages demo**, ardından **mobil layout + Capacitor**.

---

## 2026-08-26 (3) — Claude: basma hissi, menüye dönüş, itirazın kapsamı (v1.9.31)

### 1. Demo butonlarında basma hissi

İmleç patlıyordu ama buton kıpırdamıyordu — bu "basıyor" değil "üzerinde duruyor" diye
okunuyor. Artık basılan kontrolün kendisi de hareket ediyor: gerçek `.btn:active` ile
aynı 3px iniş + altın halka. Demo butonları `disabled` olduğu ve `.btn:disabled:active`
hareketi iptal ettiği için rehber kendi basmasını sürüyor. Dokuz basma noktasının
dokuzu da (CUT CURRENT, ▲, SUBMIT, ifade→exhibit, iki sayfa, PRODUCE, OBJECTION)
ölçülerek doğru kontrole oturuyor.

### 2. SAVE & QUIT

Ayarlarda. Kaydediyor, sonra masayı bırakıyor → başlık ekranı, slot değiştirilebiliyor.
IRONMAN'e verilmiyor (kaydı yok, çıkarsa kariyer buharlaşır) — `canQuitToMenu()` UI'ı
da engine'i de kapatıyor, test guard'ı bozunca kırmızıya dönüyor.

### 3. İtirazın kapsamı — ÖLÇÜMLE karar verildi

Kullanıcı "yeni dava mı yazalım?" diye sordu. Ölçüm başka bir şey söyledi:

| | önce |
|---|---|
| üretilen dosyaların duruşmalı olanı | %22 |
| **bunların transkript taşıyanı** | **%43** |
| transkriptsiz duruşma dosyası | **%57 — itiraz burada asla açılamaz** |

Darboğaz dava sayısı değildi, **zaten var olan duruşma dosyalarının yarısından
fazlasının sorgu metni yoktu.** Yapılan:
- `buildExamination` — her duruşma dosyası KENDİ isim/belge/olaylarından sorgu metni
  kuruyor (18 temiz + 22 uygunsuz soru kalıbı). Ölçüm: çekilen transkriptlerin %85'i
  benzersiz; damgalanmış tek metin yok.
- **İfade alma (deposition)**: hakim gerekmiyor, mahkeme şartı kalkıyor. `objection.depo`
  bayrağı; UI'da SUSTAINED→PRESERVED, OVERRULED→SPEAKING OBJ., "NO JUDGE IN THE ROOM".
  El yazması `depo` (Vance) ve `court2` (Pemberton) kendi metinlerini aldı.
- **İki board artık yarışmıyor:** aynı dosya hem duruşma hem kronoloji taşıyabiliyor;
  `choose()` yazı-tura atıyor. Önce hep itiraz denendiği için kronoloji sessizce açlıktan
  ölüyordu.

Sonuç: itiraz taşıyan dosya %9.6 → **%44.4**, kariyer başına **3.9 → ~17.8**.

### 4. Denge: fiyat yeniden belirlendi (asıl iş buydu)

320 kariyerlik soak, kazanmayı **%69 → %55**'e düşürdü. Sebebi ARAMADAN varsaymadım:
botun oynadığı 554 duruşmada ortalama kenar **+4.9** çıktı — yani board oyuncuya
YARDIM ediyor. Düşüş tamamen saat ve yorgunluktan geliyordu: nadir bir olayın fiyatı
(0.5h + 3 FATIGUE) 15 kez tekrarlanınca kimsenin istemediği bir zorluk artışına dönüşmüş.

`OBJECTION_HOURS 0.5 → 0`: zaten içinde olduğun duruşmada ayağa kalkmak fatura edilebilir
saat yaratmaz. `OBJECTION_FATIGUE 3 → 1`: konsantrasyon bedeli kalıyor. **Hazırlık
board'ları (kronoloji, redaksiyon) saatlerini koruyor** — onlar gerçekten ekstra iş ve
onları sen seçiyorsun.

Ölçümlü sonuç: 320 kariyer, **%65.3 kazanma, medyan gün 21, kovulma %6.6** — değişiklik
öncesi bandın içinde. replay 357/357, integrity 0.

`validActionChallengeBase`'e `minCost` parametresi eklendi (0 saat ilk kez mümkün);
regresyon "yalnız duruşma tabanı düşürebilir" kuralını kaynaktan zorluyor ve bozunca kırılıyor.

### Sıradaki kesin adım

Kullanıcı oynayıp geri bildirim verecek. Sonra **GitHub Pages demo**, ardından
**mobil layout + Capacitor**.

---

## 2026-08-26 (2) — Claude: rehberler artık GERÇEK board'u oynuyor (v1.9.30.1)

Kullanıcı dört şey bildirdi, dördü de gerçek hataydı.

### 1. "Rehberdeki doku farklı, sanki başka bir oyun"

Haklıydı ve sebep mimariydi: rehber board'ların **taklidini** çiziyordu (`guide-ring`,
`guide-card`, `guide-page`...). Taklit hiçbir zaman aslını tutmaz ve iki ayrı bakım
noktası demektir. Taklitler tamamen silindi — rehber artık **gerçek bileşeni** çiziyor:
`LockpickMinigame`, `PowerCutMinigame`, `TimelineMinigame`, `ContradictionMinigame`,
`RedactionMinigame`, `ObjectionMinigame`. Aynı JSX, aynı CSS, aynı piksel.

Bunun için her board'a `demo` prop'u eklendi: state'i ebeveyn verir, motor çağıran her
handler `demo?undefined:` ile kapanır, autofocus atlanır. Rehberin beslediği challenge
nesnesi `BoardGuide.jsx` içinde **uydurma** malzemeyle kurulur — dosya motoru import
bile etmez (regresyon bunu zorluyor).

### 2. İmleç yanlış yeri gösteriyor / geriden geliyor

Sebep: imleç yüzdeyle konumlanıyordu. Yüzde, font ve yerleşim değiştiği anda kayar;
kilitte ise hedef (slider topuzu) hareket ettiği için interpolasyon sürekli geriden
geliyordu. Artık imleç, işaret ettiği kontrolü **ölçerek** konumlanıyor
(`getBoundingClientRect`, `useLayoutEffect` — render sırasında değil, layout'tan sonra).
Kilitte topuz bir eleman olmadığı için ray genişliğinden türetiliyor.
Ölçüm: SUBMIT'e nişan alan imleç butonun tam merkezinden **1px** sapıyor.

### 3. "i"ye basınca itiraz duruşması akmaya devam ediyor

Ciddi bir hataydı: yardımı okumak duruşmayı kaybettiriyordu. Üç zamanlı board
(itiraz, kilit, sabotaj) artık `paused` prop'u alıyor; rehber açıkken frame döngüsü
hiç dönmüyor ve açılış anında `checkpointActionChallenge()` ile donmuş konum kayda
yazılıyor (rehber açıkken reload olursa aynı yerden devam).

Tarayıcıda kanıtlandı: aynı sürede rehberin kendi demosu SUSTAINED 1'e ilerlerken
arkadaki gerçek duruşma bar %100, 0 soru, 0/0/0 skorda kaldı.

### 4. Rehber başlığı görünmüyordu

`closeRef.focus()` kutuyu kendi başlığının altına kaydırıyordu → `preventScroll:true`.

### Kalıcı koruma

Yeni regresyon bloğu altı board dosyasını kaynak düzeyinde tarıyor: `demo` prop'u,
motor çağıran her `onClick`'in kapalı olması, zamanlı board'larda `demo||paused`
erken dönüşü, overlay'in `paused={guide}` geçmesi, checkpoint sırası ve rehberin
motoru import etmemesi. **Guard'ların gerçekten ısırdığı ayrıca test edildi** —
her iki invariant kasten bozulduğunda test kırmızıya döndü.

`npm test` yeşil, `npm run build` yeşil, `npm run test:soak` → replay 346/346, integrity 0.
Altı rehberin altısı da tarayıcıda tek tek doğrulandı.

---

## 2026-08-26 — Claude: izlenen walkthrough'lar, zorluğa bağlı board'lar, sertleşen kilit (v1.9.30)

### 1. Her minigame artık kendini OYNAYARAK anlatıyor

Metin kutuları gitti. `BoardGuide.jsx` altı board için de **kendi kendine dönen, izlenen**
bir simülasyon çalıştırıyor: sahnede piksel bir imleç var, doğru anda doğru yere basıyor.

- **Sabotaj:** işaretçi süpürüyor, amber pencereye girdiği anda imleç CUT CURRENT'a basıyor.
- **Kilit:** imleç çubuğu kaydırıyor, veriş noktasında **duruyor**, göbek dönüyor, PICK LIFE iniyor.
  ("There is no button to press" cümlesi artık gösteriliyor, anlatılmıyor.)
- **Kronoloji:** yanlış sıradaki kart ▲ ile kaldırılıyor, sonra SUBMIT.
- **Çelişki:** önce ifade, sonra onu imkânsız kılan exhibit — decoy'a dokunulmuyor.
- **Redaksiyon:** iki imtiyazlı sayfa karartılıyor, teslimat kaydı **bilerek** açık bırakılıyor.
- **İtiraz:** iki temiz soru geçiyor, sadece leading olana basılıyor. Kendini tutmak da öğretiliyor.

Hepsi uydurma malzeme kullanıyor — önündeki bulmacayı asla çözmüyor, çünkü rehberin işi
board'un ŞEKLİNİ göstermek, cevabını değil.

### 2. Zorluk artık board'ları da ölçekliyor

Şimdiye kadar zorluk **yalnız bilgiyi** bulanıklaştırıyordu (belgelenmiş çekirdek karar).
Bu hâlâ geçerli: `chance()` tek satır değişmedi. Değişen, ELİNLE oynadığın şeyler
(`boardTierOf`, tier 0/1/2 — **hard ve realistic aynı tier**, kullanıcının isteği):

| | EASY | MEDIUM | HARD/REALISTIC |
|---|---|---|---|
| kilit bandı | ±4 | ±3 | ±2 |
| pik aşınması | ×0.78 | ×1 | ×1.5 |
| sabotaj pencereleri | 824/302/177ms | 677/233/130ms | 519/165/86ms |
| kronoloji kartı | 4 | 4 | 5 |
| redaksiyon sayfası | 7 | 8 | 9 |
| çelişki hakkı | 5 | 4 | 3 |

**İTİRAZ bilinçli olarak MUAF** (kullanıcının isteği) — penceresi zaten oyundaki en dar şey.
Testte veriyle zorlanıyor: objection board'u hiç `diff` alanı taşımıyor, yani sessizce
ölçeklenmesi mümkün değil.

**Tier 1 = eski eğri, birebir.** Bu yüzden yarım kalmış bir board'u olan kayıtlar
schema v23'e geçtiğinde `diff:1` damgasıyla aynen yeniden türetiliyor; kimsenin oynadığı
bulmaca bir denge değişikliğiyle geçersiz olmuyor. Regresyon bunu `deepEqual` ile kilitliyor.

### 3. Kilit gerçekten zorlaştı

Kullanıcı "direk yapılıyor" dedi, haklıydı: `locksim` steady oyuncuyu **%100** gösteriyordu.
Sebep, `LOCK_WEAR_LOAD` 0.62'de kör bir taramanın bedava olmasıydı. 1.05'e çekildi —
artık sıfırdan yukarı yavaş yavaş yoklamak pikin bütçesini yiyor, yani **aramak pahalı**,
kararlı hamle beceridir.

| | SNEAKY 0 | SNEAKY 2 | SNEAKY 5 |
|---|---|---|---|
| MEDIUM careful/steady/hasty | 43/56/77% | 46/60/100% | 50/68/100% |
| HARD careful/steady/hasty | 21/38/39% | 26/41/68% | 33/46/76% |

HARD'da SNEAKY yatırımı ilk kez gerçekten belirleyici.

### Testler

`npm test` yeşil (yeni: tier sıralaması, aşınma sıralaması, tier1==eski eğri, objection muafiyeti),
`npm run build` yeşil, `npm run test:soak` → replay 346/346, integrity 0.
Altı rehberin altısı da tarayıcıda gerçek animasyonla doğrulandı.

Bir test literali daha türetilmiş hale getirildi: kilidin "dönüş pikin hepsini yemez"
kontrolü artık `LOCK_WEAR_MAX`'in oranı, sabit 45 değil — aşınma yeniden ayarlandığında
test sessizce yanlış şeyi ölçmesin.

### Sıradaki kesin adım

Kullanıcı oynayıp geri bildirim verecek. Sonrasında **GitHub Pages demo**, ardından
**mobil layout + Capacitor**.

---

## 2026-08-22 — Claude: kilidi okunur yapmak, board sıklığı ve rehberler (v1.9.29)

### Kullanıcı geri bildirimi ve karşılıkları

**"Kilit çok garip, nasıl yapacağımı anlayamadım."** Mekanik doğruydu ama ekran çelişiyordu:
göbek GERİLİMLE dönüyordu (yani her yerde "ilerliyorum" der gibi), ilerleme ise ayrı bir yeşil
bardaydı. İki sinyal aynı resimde farklı şey söylüyordu. Düzeltme:
- Göbek artık YALNIZCA silindir dönerken dönüyor — dönüş = ilerleme, tek anlam.
- Tek büyük başlık: "HOLD IT — TURNING %n" / "TOO FAR. EASE OFF." / "NOT HERE. KEEP MOVING."
- "PICK WEAR 0→100" yerine "PICK LIFE 100→0": kaynak azalır, oyuncu bunu bekler.

**"İtiraz/kronoloji/çelişki hâlâ aynı geliyor."** Kısmen haklıydı ve sebebi ölçüldü:
board kimliği `runSeed|caseId|actionId` olduğu için DEV panelinden aynı davayı tekrar açmak
TASARIM GEREĞİ aynı board'u veriyordu (save/reload kararlılığı buna dayanıyor). Panel artık her
açılışta run seed'ini döndürüyor. Ayrıca iki havuz gerçekten küçüktü:
kronoloji 7→11 olay (35→330 kombinasyon), çelişki 6→9 çift + 3→5 decoy (60→420).
Ölçüm: 300 farklı run'da farklı board — objection 292, timeline 297, contradiction 236.

**"Minigameler daha sık olsun, çoğu davada."** Taşıma oranları ve tetikler yükseltildi
(TIMELINE_TRIGGER 25→55, OBJECTION_TRIGGER 30→60, şablon taşıma oranları .45-.6 → .7-.95).
Üretilen dosyaların **%55.3**'ü artık bir board taşıyor. Kariyer başına açılış: kronoloji
1.10→**2.19**, itiraz 1.18→**2.52**. Denge korundu: 160 kariyerde kazanma **%68.1**
(yerleşik bant ~%65-70) — board'lar saat/yorgunluk yediği halde oyun sertleşmedi.

**"Minigamelerde i butonu olsun, örnek göstersin."** `BoardGuide.jsx`: her board'un sağ üstünde
altın **i** düğmesi. Açılan kutu **uydurma malzemeyle** çalışılmış bir örnek gösteriyor — önündeki
bulmacayı ASLA çözmüyor. Elektrik sabotajında metin yerine **canlı animasyon**: işaretçi süpürüyor,
amber pencerede duruyor, altında "STOPPED INSIDE THE WINDOW" yazıyor. Zamanlama anlatılamaz,
gösterilir.

**"Elektrik güzel olmuş"** — dokunulmadı (pencereler 559/277/149 ms).
**"Redaksiyon yeterince açık"** — kural kartı korundu.

### Testler

`npm test` yeşil, `npm run build` yeşil, `npm run test:soak` → replay 346/346, integrity 0.
Tarayıcıda: kilit başlığı ve PICK LIFE doğrulandı, i rehberi hem kilitte hem sabotajda (animasyonlu)
açıldı.

### Sıradaki kesin adım

Kullanıcı oynayıp geri bildirim verecek. Sonrasında **GitHub Pages demo**, ardından
**mobil layout + Capacitor**.

---

## 2026-08-22 — Claude: altı yeni prosedürel şablon (v1.9.27)

### Neden

Ölçüm: 30 günlük kariyerde ~67 dosya çözülüyor, 12 şablon vardı → aynı şablon **5.6 kez**
tekrarlıyordu. Sorun sıkıcılık değil, **okuma sebebinin ölmesi**: isim ve rakam değişse de
kazandıran ipucu aynı kaldığı için oyuncu ipucu ezberleyip metni atlıyor. Oyunun çekirdek vaadi bu.

### Eklenen şablonlar (hepsi farklı hukuki argüman)

13. **Teslim edilmemiş istisna** — poliçe istisnası yenileme ekinde var ama ek hiç ulaşmamış;
    taahhütlü posta alındısını 11 ay önce işten ayrılmış biri imzalamış.
14. **Ödenemeyen tahkim şartı** — şart geçerli ama iki bin mil ötede, ücretler paylaşımlı ve talep
    dosyalama ücretinden küçük; girilemeyen forum forum değildir.
15. **Kendi kendini silen dizüstü** — otomatik silme dört yıl düzenli çalışmış, hold mektubundan
    iki gün sonra elle kapatılmış *(kronoloji %50)*.
16. **Kendi memosunun itiraf ettiği çıkar çatışması** — karşı taraf vekili aynı işte üç yıl önce
    müvekkilini temsil etmiş; iç çatışma memosu yanlışlıkla üretilmiş *(redaksiyon %45)*.
17. **Zaten sulh olmuş sınıf temsilcisi** — lead plaintiff bu talepleri iki yıl önce 900 dolara
    ibra etmiş *(itiraz %50, mahkeme)*.
18. **Var olmayan unvanlı bilirkişi** — CV'deki sertifikayı veren kurum "böyle bir belge hiç
    vermedik" diyor *(çelişki tablosu %50, mahkeme)*.

### Sonuç

- Şablon tekrarı kariyer başına **5.6 → 3.7**.
- Farklı dava iskeleti: 47 (isim/rakam varyasyonları hariç).
- Board dağılımı daha da dengelendi: timeline %17.6, objection %8.1, redaction %7.2,
  contradiction %5.1, lockpick %2.5, power_cut %2.3 — herhangi bir board %42.8.
- Tier dağılımı sağlıklı: t0 %11, t1 %67, t2 %22 (mahkeme şablonu 2'den 4'e çıktı, rank≥1'de
  duruşma içeriği artık kıt değil).
- **Denge bozulmadı:** 120 kariyer, kazanma %65.8 — yerleşik ~%65-70 bandının içinde.

### Yeni kalıcı test: içerik derinliği

`npm test` artık üretilen her dosyayı denetliyor: garantili çıkış seçeneği var mı, en az bir riskli
okuma var mı, tier≥1 dosyalarda gövde ipucu saklayacak kadar uzun mu, deadline geçerli mi. Ayrıca
üretilen farklı iskelet sayısının 40'ın altına düşmesi testi kırıyor — içerik eklerken bozuk dosya
kaçıramayız, içerik **azaltırken** de fark ederiz.

### Testler

`npm test` yeşil, `npm run build` yeşil, `npm run test:soak` → replay 329/329, integrity 0.

### Sıradaki kesin adım

Değişmedi: **GitHub Pages demo**, ardından **mobil layout + Capacitor**. İçerik tarafında bir sonraki
adım (yapılırsa) **B planı**: mevcut şablonlara alternatif kazandıran ipuçları vermek — aynı başlığı
görsen bile okumak zorunda kalman için. Bu tur A planıydı (yeni şablon), B daha invaziv.

---

## 2026-08-22 — Claude: genel kontrol + board erişilebilirliği (v1.9.26)

### Genel kontrol bulguları

Kullanıcı "genel bir kontrol yap" dedi. Katman kuralı, RNG kuralı, bağımlılıklar (`npm audit` 0),
save zinciri (21 migration / 92 doğrulama noktası), bundle (439 KB, gzip 147 KB) ve soak temizdi.
İki gerçek bulgu çıktı:

**1. `npm test` KIRIKTI ve tarihe bağlıydı (üçüncü tekrar).** DAILY senaryoyu takvimden seçiyor;
o gün `debtor` çıkınca doğuştan ENDURANCE work-fatigue'i 7'den 6'ya indirdi, testte sabit `7`
yazıyordu. Beş beklenti `toil()` ile türetildi ve suite'e **kendi kaynağını tarayan bir kural**
eklendi: `state.S.fatigue` içeren bir satır sabit sayı yazarsa test kırılıyor (gerçek bir gizli
bomba daha yakaladı: `pitchTurnaround`). Bilinçli istisnalar `fatigue-literal-ok` ile işaretleniyor.
Farklı saat dilimlerinde doğrulandı.

**2. Yeni board'lar oyuncuya ulaşmıyordu.** Ölçüm (240 kariyer × 30 gün):

| Board | Verisi nerede | Görülen kariyer | Açılış/kariyer |
|---|---|---|---|
| Timeline | 5 prosedürel şablon | %82 | 1.9 |
| Objection | **yalnız `court1`** | %25 | 0.25 |
| Redaction | **yalnız `nda`** | — (gönüllü) | — |

Yani iki oturumluk emek, uzun bir kariyerde bir kez bile çıkmayabiliyordu.

### Yapılan: board dağıtımı

- **Objection** iki mahkeme şablonuna yazıldı (3: geç dosyalama — records custodian sorgusu;
  4: vasiyet — tanık sorgusu). Her biri 10 satır, 5'i hatalı (leading/hearsay/assumes facts/
  speculation/argumentative), üretilen isimler satırlara giriyor.
- **Redaction** iki belge şablonuna yazıldı (2: sözleşme uyuşmazlığı üretim demeti; 8: fesih —
  personel dosyası). Tuzaklar korundu: PR ajansına cc'li mail imtiyazlı değil, ücret tarifesi değil.
- **Tek dosya tek board:** mahkeme şablonlarında objection ve timeline/contradiction artık **tek
  zarla** seçiliyor (birbirlerinin tetiğini yiyorlardı — `choose()` içinde objection önce denenir).
- **Timeline kısıldı:** üç şablonda koşulsuzdu, `rand()<.6` ile seyreltildi.

### Sonuç (aynı 240 kariyer, öncesi → sonrası)

| | görülen kariyer | açılış/kariyer |
|---|---|---|
| Timeline | %82 → **%68** | 1.9 → **1.10** |
| Objection | %25 → **%70** | 0.25 → **1.18** |

Üretilen dosya başına dağılım: timeline %41.8 → **%22.3**, redaction 0 → **%7.4**, objection 0 →
**%6.9**, contradiction/lockpick/power_cut %3.8 (değişmedi). Artık tek board varsayılan deneyim
değil.

### Testler

- `npm test` yeşil (üç saat diliminde ayrı ayrı). Coverage testi genişletildi: generator'ın **her
  iki** prep board'unu da üretebildiği artık zorunlu invariant.
- `npm run build` yeşil. `npm run test:soak` → replay 328/328, integrity 0.

### Sıradaki kesin adım

**GitHub Pages demo** (tek workflow; repo görünürlüğü kullanıcının kararı), ardından
**mobil layout + Capacitor**. Backlog'da: bağlamsal SFX, Steam paketleme, barodan atılma fikri,
3. minigame (parçalanmış belge — önerilmedi).

---

## 2026-08-18 — Claude: OBJECTION + PRIVILEGE REVIEW (v1.9.25)

### Git checkpoint

- Branch: `objection` (kullanıcı `main`'e merge sonrası açtı), base commit `3d5da494f`
  (itiraz board'u commit edildi, redaksiyon commit bekliyor).
- `minigames` → `main` merge'ü `da60d28cc` ile indi.

### 1 — OBJECTION (duruşmanın içinde zamanlama)

Detay CLAUDE.md v1.9.25 girdisinde. Özet: court dosyasında riskli hamleye commit edince %30 ile
açılır, sorgu satırları 2600ms ayakta durur, sustained/overruled/missed skoru `c.hearingEdge`'e
(−10..+12) yazılır. `judge.book>=60` ise yersiz itiraz iki kat. `judgeMemory`'ye BİLİNÇLİ yazılmaz.

**Soak bunu yakaladı:** board istemsiz açıldığı için headless bot tanımadı ve **159 integrity
hatası** verdi. Bota duruşmayı oynattım (satır satır frame yakarak), replay tekrar temiz.

### 2 — PRIVILEGE REVIEW (iki taraflı hata)

- Gönüllü CASE PREP seçeneği (`style:"prep"`, `action.type:"redaction"`), 1.5h + 6 FATIGUE.
- Havuzdan 8 sayfa çekilir; imtiyazlı olanlar karartılmalı, sıradan iş kayıtları karartılmamalı.
  Tuzaklar bilinçli: müvekkilin PR ajansına yazıp seni cc'lediği mail (üçüncü taraf imtiyazı kırar)
  ve engagement letter'ın ücret tarifesi.
- **İki başarısızlık iki farklı para birimiyle ödenir:** sızdırma dosyanın ŞANSINI düşürür
  (`covertEdge` sızan oranla −10'a kadar iner; `covertEdge` alt sınırı bu yüzden 0 → −10 yapıldı),
  aşırı karartma ise REP (−2/sayfa) ve 2+ sayfada mahkeme yaptırımı (−2 FIRM) getirir. Hiçbir şey
  yapmamak nötr değil — birinci başarısızlığın ta kendisi.
- Doğrulanan davranış (tarayıcı): temiz üretim +15 "PRIVILEGE HELD"; her şeyi karartmak −12 REP
  −2 FIRM + "SANCTIONED: the court orders the bundle re-produced unredacted"; hiç dokunmamak
  3 sızıntı → −10 kenar, "YOUR OWN FILE, IN THEIR HANDS", şans −10.

### Kesinti kazası ve temizliği

Oturum ortasında iki kez "Try again" tetiklendi ve aynı yamalar iki kez uygulandı: `engine.js`'te
REDACTION bloğu, validation bloğu, completion routing'i, save cross-check'i ve migration satırı
çiftlendi; `state.js`'te sayaçlar iki kez eklendi. Hepsi tespit edilip tekilleştirildi
(`grep -c` ile doğrulandı). Ders: bu dosyalarda idempotent olmayan `replace(anchor, block+anchor)`
kalıbı tekrar çalıştırılırsa sessizce çiftler.

### Testler

- `npm test` yeşil: itiraz (transkript/strict bench/reload/6 tamper/v20 migration) + redaksiyon
  (iki taraflı skor/yaptırım/reload/tamper/v21 migration).
- `npm run build` yeşil. `npm run test:soak` → replay 344/344, integrity 0.
- Tarayıcı: itirazda overruled→sustained zinciri gerçek tıklamalarla, redaksiyonda üç sonuç yolu da
  doğrulandı.

### Sıradaki kesin adım

Kullanıcı kararı: 3. board (parçalanmış belge) **önerilmedi** — Timeline'ın sıralama fiilinin
mekânsal kopyası olurdu. Kullanıcı isterse yapılır, istemezse backlog'da kalır. Ondan sonra sırada
**mobil layout + Capacitor** var.

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

