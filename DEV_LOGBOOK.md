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

