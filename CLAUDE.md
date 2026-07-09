# FANCY OUTFITS — Project Handoff Document

> Bu dosya `CLAUDE.md` olarak proje kökünde durduğu için Claude Code tarafından otomatik okunur.
> Amaç: bu projeye sıfırdan katılan bir geliştiricinin (insan veya AI) hiçbir bağlam kaybı olmadan devam edebilmesi.

---

# 1. Project Overview

**Oyun:** FANCY OUTFITS — Suits dizisinden esinlenen, piksel görünümlü bir avukatlık kariyer simülasyonu.

**Tür:** Metin ağırlıklı karar/simülasyon oyunu (narrative decision game + time management). Yürüme/3D/fizik YOK. Oyuncu masasında oturur, dava dosyaları okur, replik seçer.

**Platform:** Tarayıcı. Tek dosya (`index.html`), sunucu/build gerektirmez. Çift tıkla açılır. GitHub Pages'e atılırsa direkt yayınlanır (dosya adı bu yüzden `index.html`).

**Core gameplay loop:**
1. Gün başlar → gerçek zamanlı sayaç (75 sn = 1 gün) işler.
2. INBOX'a dava dosyaları, partner ayak işleri ve mesajlar düşer.
3. Oyuncu dosyayı açar, metni GERÇEKTEN okur — kazandıran argüman genelde metnin içinde saklıdır (ör. yetkisiz imza, tarih çelişkisi).
4. 2–4 seçenekten birini seçer. Her seçeneğin hesaplanmış başarı %'si vardır.
5. Sonuç anında gelir ya da (delay'li seçeneklerde) birkaç gün sonra "REPLY" olarak düşer. Dava ertelenebilir ama her davanın deadline'ı vardır; kaçarsa otomatik ceza.
6. Süre biter → gün özeti → yeni gün → yeni davalar + olasılıksal kriz eventi.

**Oyuncunun amacı:** Junior Associate'ten başlayıp Influence biriktirerek NAME PARTNER olmak (kazanma koşulu). Kaybetme koşulları: Reputation < 20 (kovulma), Debtor senaryosunda kredi taksidini kaçırma.

**Temel gerilim (oyunun kalbi, değiştirme):** Güvenli seçenek (yeşil) %100 başarılı ama Boldness düşürür ve az kazandırır. Cesur seçenek (kırmızı/blöf) çok kazandırır ama şansı Boldness'a bağlıdır ve başarısızlığı Reputation yakar. Korkaklık yavaş ölüm, pervasızlık hızlı ölüm.

**İlham:** Suits (tema, mizah, karakter arketipleri — isimler parodi: Pearson Hardman → **Parson Henderson LLP**, Louis Litt → **Lou Bitt**, "You just got LITT up" → **"HENDERED!"**, rakip firma **Snidely Fitch**). Görsel/yapısal ilham: Papers Please tarzı sade, masabaşı, piksel estetik. NOT: Oyun içi "i" bilgi panelinde bu ilham kaynaklarından BAHSEDİLMEZ — kullanıcının bilinçli tercihi.

---

# 2. Current Development Status

**Tamamlanan (v0.2, çalışıyor):**
- 3 başlangıç senaryosu: The Fraud (diploma yok, özel expose kriz eventi), The Debtor (3 günde bir $2000 taksit, kaçırırsan game over), The Legacy (Influence kazançları ×1.25, Reputation kayıpları ×1.25).
- Gün döngüsü: 75 sn timer, END DAY butonu, gün sonu özeti, deadline kontrolü.
- 9 el yazması dava (3 tier: 0=ayak işi, 1=gerçek dava, 2=mahkeme), her biri 3 seçenekli.
- Başarı şansı motoru (`chance()`): base + Boldness ölçeklemesi + hakim modifierleri + saygı modifieri + rütbe baskısı.
- Delayed response: seçim anında zar atılır, sonuç N gün sonra REPLY olarak açıklanır.
- 4 hakim (temper / by-the-book statlı), mahkeme davalarında dosya üzerinde görünür.
- 4 kriz eventi (2 genel + 2 senaryoya özel), gün başında %60 ihtimalle tetiklenir, her biri run başına 1 kez.
- Kariyer: Influence eşikleri [30,55,80,100] → 5 rütbe. Name Partner = win ekranı.
- Saygı sistemi: REP<30 → riskli seçenekler −12, ofiste "someone's lunch", tabure sandalye, inbox'a aşağılayıcı mesajlar. REP>70 → +5 ve övgü caption'ı.
- Günlük REP çürümesi: her gece −1 ("the firm forgets fast").
- Dinamik piksel ofis sahnesi (inline SVG, rütbeyle büyür: bullpen → paylaşımlı ofis → kendi ofisin → köşe ofis → name partner süiti).
- WebAudio sentez SFX (10 efekt) + mute toggle.
- "i" bilgi paneli (oyunu açıklar, ilham kaynaklarını anmaz).
- GDD: `FANCY_OUTFITS_GDD.md` (tasarım referansı, AI dava üretimi için JSON şeması dahil).

**Yarım / hiç başlanmamış (GDD'de tasarlandı, kodda YOK):**
- NPC ilişki sistemi (relationship skoru, Reliable/Brave/Lazy/Traitor traitleri).
- İş delege etme (Senior Associate'te açılacaktı).
- AI ile runtime dava üretimi (şema hazır, entegrasyon yok).
- Save/load, kalıcı istatistikler, multiplayer.

**Bilinen buglar/pürüzler:** Bkz. Bölüm 10.

**v0.4 eklendi (2026-07-05, kullanıcı onayıyla):**
- **NPC ilişki sistemi** (GDD §5): 4 NPC (Dana Paulsen, Raquel Lane, Harold Gustavson, Katrina Bergman), her run'da Reliable/Brave/Lazy/Traitor traitleri rastgele dağıtılır (her birinden tam bir tane). Traitler GİZLİ başlar; ilk delege ediş veya kriz açığa çıkarır. İlişki −100..+100, "THE FLOOR" panelinde görünür.
- **Delege etme** (rank≥1'de açılır): mahkeme dışı davalar bir NPC'ye verilir, zar ANINDA atılır, sonuç ertesi sabah gelir. Şans = 60 + rel/5 + trait modu (Reliable +25, Brave +10, Lazy −20, Traitor −5). Lazy fail'lerin %65'i "sessiz bırakma" (dosya deadline'ı yanmış halde masana döner); Traitor fail'i ekstra −4 REP.
- **Krizlerde NPC etkisi:** rel<25 Traitor %40 ihtimalle pozisyonunu sızdırır (tüm seçenekler −8%), yoksa rel≥40 Brave arkanda durur (+8%). Overlay'de görünür, trait'i açığa çıkarır.
- **Prosedürel dava üreticisi** (`casegen.js`): API YOK, ağ YOK — kullanıcının açık isteği ("Claude API key oyuna entegre olmasın"). 7 şablon × isim/rakam/ipucu havuzları; el yazması 9 dava tükenince veya 3. günden sonra %40 ihtimalle devreye girer. Eski bug #3 (havuz tekrarı) böylece çözüldü.
- **PAUSE butonu:** ekranı KAPATAN overlay — bilinçli: açık dosyayı bedava okuma süresi vermesin (çekirdek gerilim korunur).
- **Ofis sahnesi v2 + karakter:** sol kapı, duvar saati, dosya dolabı, kitaplık, halı, çöp kutusu, jaluzi, masada kahve+dosyalar; masada OTURAN oyuncu karakteri (takım elbise rütbeyle güzelleşir — oyunun adı bu), gün bitince kalkıp kapıdan çıkar (`S.charAnim`, özet yürüyüşten sonra açılır), yeni günde içeri yürüyüp oturur.

**v0.5 eklendi (2026-07-05, kullanıcı onayıyla):**
- **Save/load:** run her önemli aksiyonda `localStorage`'a otomatik kaydedilir (`SAVE_KEY`, transient UI alanları soyulur — `event`'te fonksiyon var, serialize edilmez). Start ekranında CONTINUE butonu (gün/rütbe/senaryo gösterir). Run bitince kayıt silinir.
- **Kalıcı istatistikler (FIRM RECORD):** `STATS_KEY` — toplam run, kazanma, en uzun kariyer, en yüksek rütbe, kaybediş sebepleri. Start ekranının altında görünür.
- **Para harcama:** TAILORED SUIT ($1200, +8 REP, her alışta fiyat ×1.5 — `S.suitCost`), BRIBE MARV ($600, bilinmeyen bir NPC trait'ini açıklar + rel +5; hepsi biliniyorsa herkese rel +4), HIRE DETECTIVE ($900, açık dosyaya `dossier` — o dosyanın riskli seçeneklerine +12%). İlk ikisi StatsPanel "EXPENSES", dedektif CasePane'de.
- **Rütbeyle büyüyen riskler (kullanıcı isteği):** dava çekilirken fx'ler rütbeye göre ölçeklenir (`scaleStakes`, DEEP copy üzerinde): ödüller ×`STAKE_REWARD[rank]` (1→1.6), cezalar ×`STAKE_PENALTY[rank]` (1→2.2) — cezalar daha hızlı büyür. Dosya üzerinde "STAKES ×a win / ×b loss" satırı görünür. Terfi, açık dosyaları geriye dönük ölçeklemez.

**v0.6 eklendi (2026-07-06, kullanıcı onayıyla):**
- **Çok aşamalı davalar:** herhangi bir seçeneğin `ok`/`fail` sonucuna `next:{after,note,case}` eklenebilir; sonuç gerçekleşince takip dosyası `S.followups` kuyruğuna girer (`queueFollowup`), `after` gün sonra sabah `spawnFollowups()` ile inbox'a düşer (`chain:true` → altın "FOLLOW-UP FILING" etiketi). Takip dosyası SPAWN anındaki rütbeyle stake-ölçeklenir ve kendi hakimini çeker. `instantiateCase()` ortak yardımcı. Delayed ve kriz sonuçları da zincir kurabilir.
- **El yazması zincirler:** `breach` (Aldergate: teknik kazanç → NimbusHost temyizi; agresif fail → kendi yaptırım duruşman) ve `court1` (teknik kazanç → Halcyon temyizi).
- **Üretici zinciri:** casegen şablon 3 (geç dosyalama) %50 ihtimalle temyiz aşaması taşır.
- **Bug #4 FIX:** `RANK_REQ[3]` 100→95 (INF tavanı 100; tek kötü gün finali kilitlemesin).

**v0.7 eklendi (2026-07-06, kullanıcı isteği):**
- **Bulanık şans gösterimi + zorluk modları:** kesin % kalktı. Start ekranında seçilir (`S.difficulty`): easy ±5 / medium ±9 / hard ±14 aralık; realistic = hiç sayı yok. Aralık, run seed'inden (`S.seed`) türetilen hash ile MERKEZDEN KAYDIRILIR (ortası gerçek değeri ele vermesin) ve stabildir (render'da titremez). Dava seçenekleri, kriz seçenekleri ve delege %'leri aynı sistemi kullanır (`displayPct`/`displayChance`). ZAR MATEMATİĞİ DEĞİŞMEZ — `chance()` aynen; zorluk sadece BİLGİYİ bulanıklaştırır. Safe seçenekler realistic dışında "100%" yazar. Mod, StatsPanel RUN satırında görünür ve save'e girer.

**v0.8 eklendi (2026-07-06, kullanıcı onayıyla):**
- **Haftalık ritim (cuma değerlendirmesi):** her `WEEK_LEN`(5). gün cuma; topbar "FRI IN n" sayar. Gün sonu özeti PARTNER REVIEW içerir: skor = (INF kazancı) + (REP değişimi/2) − (kaçan deadline×3), hafta başı baseline'a göre (`S.weekStart`, `S.weekMissed`). Skor ≥ `REVIEW_GOOD`(10) → +4 REP +4 INFL; ≤ `REVIEW_BAD`(0) → −4 REP; arası kuru nötr cümle. Her kararın 3 flavor varyantı var. Cuma gecesi baseline sıfırlanır. Review REP'i tabana düşürürse gameOver sıralaması korunur.

**v0.9 eklendi (2026-07-06, kullanıcı onayıyla):**
- **Lo-fi ambiyans (prosedürel):** `sound.js`'te 4 akorluk döngü (detune'lu triangle + lowpass) + filtreli noise cızırtısı; dosya YOK. Topbar'da BGM toggle (SFX'ten bağımsız, `localStorage fo_bgm`). startGame/loadGame başlatır, gameOver/gameWin durdurur.
- **Farklı sonlar:** gameWin, stat'a göre unvan seçer (BOLD≥65 SHARK / REP≥70 BELOVED / BOLD≤32 SURVIVOR / else OPERATOR) + senaryoya özel kapanış satırı (fraud/debtor/legacy).
- **Rüşvete açık hakimler (GDD §7 corruptible):** JUDGES'a `corrupt` statı (Ironwood 5, Marsh 45, Pelt 10, Crane 75). Dosyada "ETHICS: granite/flexible/'sociable'" görünür. corrupt≥40 → `instantiateCase` dosyaya altın "discuss golf" seçeneği ekler: maliyet $900+300×rank (kazan-kaybet fark etmez peşin düşer, `o.bribe`), base=corrupt−15, fail −13 REP. Para yetmezse buton disabled + engine guard.
- **Ters yönlü ilişki (favor):** her sabah %30 (inbox'ta favor yoksa) bir NPC 1 günlük FAVOR dosyası bırakır (`buildFavor`, npcs.js). Seçeneklerde `relOk/relFail` — rel değişimini `choose()` işler (apply stats-only kalır). Sessiz yardım +10 rel; gösterişli yardım riskli (+INFL / kredi çalmış görünme); ret −8 rel; deadline kaçırma −10 rel (REP cezası ve weekMissed'e girmez). Favor delege/dedektif edilemez.

**v1.0 eklendi (2026-07-06, kullanıcı onayıyla):**
- **Rakip associate (nemesis):** `S.nemesis={name,inf,rank}` (isim `state.js` NEMESES'ten). `nemesisGain(v,fromFailure)` — gece rastgele +0..3, senin fail'lerinden +3-4 (dava/delayed/delege/kriz fail + kaçan deadline). Rank 4'e ulaşırsa `gameOver("OUTPACED")`. StatsPanel'de RIVAL satırı (AHEAD/behind + INF barı).
- **Terfi geçiş sahnesi:** `checkPromotion` rank artınca `promoWalk(oldRank)` çağırır — `S.sceneRank=oldRank` (OfficeScene eski ofisi çizer), karakter çıkar (1.5s) → yeni ofise girer → oturur. `sceneRank` transient (save'de soyulur). Gün sonu yürüyüşüyle çakışmaz (`S.leaving` guard).
- **Marv büyüdü:** `S.marvBribes` sayacı; `marvMoment()` (%18/sabah) tekrarlayan mini-event, rüşvet geçmişine göre replik değişir; ≥1 rüşvette %50 canlı dosyaya bedava `dossier` düşürür. `bribeMarv` replikleri de sayaca göre.
- **İçerik:** casegen 7→12 şablon (backdated email, patent, guaranty, HOA vb.), 2 yeni kriz (billing audit, client defection), 3 yeni hakim (Whitlock, Okonkwo, Fairway corrupt 85).
- **Run ledger:** `S.runStats` (safe/bluffW/L/techW/L/deleg/bribe/favor/miss/crises) `trackChoice()` ile işlenir; `ledger()` gameWin/gameOver özetine döküm ekler.
- **Ayarlar paneli (`settings.js`, run save'inden AYRI `fo_settings_v1`):** dayLen 60/75/90, sfx/bgm 0/.5/1, shake on/off. Topbar'da SET butonu + hızlı SFX/BGM aç-kapa. `sound.js` artık `settings.sfx/bgm`'i okur (eski muted/bgmOn bayrakları kaldırıldı). **Ekran sarsıntısı:** `S.shakeSeq` fail'lerde artar, App `.shaking` class'ını replay eder (settings.shake gate).

**v1.1 eklendi (2026-07-09, kullanıcı isteği):**
- **4. senaryo "The Defector":** Snidely Fitch'ten transfer. `chance()`'te Fitch geçen dosyalara riskli seçeneklerde +8 (metin match: `/Snidely Fitch/`, parodi isim sabit olduğu için güvenli). 2 özel sabotaj krizi: `poisonfile` (gün≥2), `counteroffer` (gün≥4).
- **Başarımlar (`achievements.js`, `fo_ach_v1`):** 10 adet, run'lar arası kalıcı, start ekranında listelenir (■/□). `unlock(id)` ilk açılışta true döner; engine `ach(id)` ile log+SFX.bell fanfarı basar. Kancalar: gameWin (win/realistic/nosafe/defector/ironman/bold≥65), delegateCase (Traitor'a 5.), choose (bribeW≥3), cuma övgüsü, gün≥15. İleride Steamworks'e 1:1 map'lenecek.
- **Oyun modları (`S.mode`, start ekranında seçilir):** standard / **ironman** (saveGame no-op — kayıt yok) / **endless** (gameWin ilk seferde `S.endlessWon=true` + "KEEP BILLING" özeti, run devam eder; nemesis rank 4'e çıkamaz; `recordRun` `S.runRecorded` ile tek sefer sayar) / **daily** (tarih hash'i `setSeed`'e verilir, senaryo tarihten seçilir, zorluk MEDIUM'a kilitli, `S.dailyDate`).
- **Deterministik RNG (`utils.js`):** mulberry32 tabanlı `rand()/setSeed()/clearSeed()`. TÜM oyun mantığı artık `rand()` kullanır — `Math.random` SADECE `sound.js`'te kalır (ses jitter'ı deterministik akışı tüketmesin). Yeni kod yazarken bu kurala uy.
- **Klavye kısayolları (App.jsx `handleKey`):** 1-4 seçenek seçer (dava + kriz; paran yetmeyen bribe yok sayılır), Space dosya erteler/özeti ilerletir, Esc panelleri kapatır. Seçenek metinleri numaralandı. Handler modül `S`'ini okur (stale closure yok), sadece engine fonksiyonu çağırır.

**En son çalışılan konu (2026-07-09):** v1.1 (Defector + başarımlar + modlar + klavye) tarayıcıda uçtan uca test edildi. Kullanıcının onayladığı sıradaki işler: dava arşivi, NPC hikâyeleri, rakiple etkileşim, hakim hafızası; sonrasında mobil (Capacitor + mobil layout).

---

# 3. Tech Stack

- **Framework:** React 18 + Vite 5 (karar: 2026-07-05, kullanıcı isteğiyle — önceki "tek dosya vanilla" kararının yerini aldı). JSX, ES modülleri.
- **State:** Framework state kütüphanesi YOK. Tek global mutable obje `S` (`src/game/state.js`) + minimal store: engine `S`'i mutasyona uğratır, `notify()` çağırır; React `useSyncExternalStore` ile dinler (`useGame()` hook'u). Oyun mantığı React'ten tamamen bağımsız saf JS modülleri.
- **Dış bağımlılık (runtime):** react, react-dom + Google Fonts'tan `Press Start 2P` (CSS `@import`; internet yoksa monospace fallback). Başka runtime bağımlılığı EKLENMEZ.
- **Ses:** Web Audio API ile runtime sentez — hiçbir ses dosyası yok (`src/game/sound.js`).
- **Grafik:** CSS (chunky border, scanline overlay) + ofis sahnesi için runtime üretilen inline SVG (`OfficeScene.jsx`). Hiçbir görsel asset dosyası yok.
- **Build/deploy:** `npm run dev` (Vite dev server, tarayıcı), `npm run build` (statik `dist/` — GitHub Pages/itch.io'ya konabilir), `npm start` (build + Electron masaüstü penceresi, Steam hedefi). `vite.config.js`'te `base:'./'` — Electron `file://` ve Pages alt yolları için gerekli, bozma.
- **Steam yolu:** Electron wrapper `electron/main.js`. İleride: `electron-builder` ile exe/app paketleme + `steamworks.js` ile Steamworks entegrasyonu (henüz eklenmedi).

---

# 4. Full File Structure

```
fancy-outfits/
├── index.html                    ← Vite giriş HTML'i (sadece #root + main.jsx import)
├── vite.config.js                ← Vite ayarı (react plugin, base:'./')
├── package.json                  ← scripts: dev / build / preview / start(=build+electron)
├── electron/main.js              ← Electron ana süreci: pencere açar, dist/index.html yükler
├── src/
│   ├── main.jsx                  ← React mount
│   ├── App.jsx                   ← layout + overlay'lerin koşullu render'ı
│   ├── styles.css                ← TÜM CSS (palet :root'ta, scanline, panel, paper, overlay)
│   ├── game/                     ← OYUN MANTIĞI (React'ten bağımsız saf JS)
│   │   ├── constants.js          ← RANKS, RANK_REQ, DAY_SECONDS, STAKE_*, PRICES, WEEK_*, SAVE/STATS_KEY
│   │   ├── settings.js           ← global tercihler (dayLen/sfx/bgm/shake), run save'inden AYRI
│   │   ├── state.js              ← S, newState(), store (subscribe/notify), nemesis/runStats
│   │   ├── engine.js             ← apply(), chance(), akış + nemesis/terfi sahnesi/ledger/ayarlar
│   │   ├── content.js            ← buildPool() 9 el yazması dava, JUDGES(7), crises(), SCENARIOS
│   │   ├── casegen.js            ← PROSEDÜREL dava üreticisi (12 şablon, API'siz, offline)
│   │   ├── achievements.js       ← 10 başarım, localStorage (fo_ach_v1), unlock()
│   │   ├── npcs.js               ← NPC roster, trait dağıtımı, delegationChance(), buildFavor()
│   │   ├── sound.js              ← WebAudio sentez SFX + prosedürel ambiyans (settings'ten ses)
│   │   ├── utils.js              ← clamp, rnd, hash, rand/setSeed (deterministik RNG — daily mod)
│   │   └── useGame.js            ← React köprüsü (useSyncExternalStore hook'u)
│   └── components/               ← UI (her panel/overlay ayrı dosya)
│       ├── StartScreen.jsx       ← senaryo + zorluk seçimi, CONTINUE, FIRM RECORD
│       ├── Topbar.jsx            ← logo, rütbe, gün+FRI, saat+bar, SFX/BGM/i/SET/PAUSE/END DAY
│       ├── OfficeScene.jsx       ← piksel ofis SVG'si + karakter (otur/yürü/terfi sahnesi sceneRank)
│       ├── Inbox.jsx             ← sol panel (dava/pending/delegated/msg/favor/chain)
│       ├── CasePane.jsx          ← orta panel (dava + seçenekler + DELEGATE + dedektif + bribe)
│       ├── StatsPanel.jsx        ← sağ panel (statlar, para, RIVAL, EXPENSES, THE FLOOR, log)
│       ├── InfoOverlay.jsx       ← "i" paneli
│       ├── PauseOverlay.jsx      ← PAUSE ekranı (masayı kapatır — bilinçli)
│       ├── SettingsOverlay.jsx   ← ayarlar (gün süresi, ses, sarsıntı)
│       ├── EventOverlay.jsx      ← kriz ekranı (+ Traitor/Brave modifier satırı)
│       └── SummaryOverlay.jsx    ← gün sonu / cuma review / game over / win + run ledger
├── FANCY_OUTFITS_GDD.md          ← Tasarım dokümanı (gelecek özelliklerin speci)
├── README.md                     ← GitHub vitrini + CHANGELOG (her versiyonda güncellenir — §6 kuralı)
├── CLAUDE.md                     ← Bu dosya
├── .gitignore                    ← node_modules/, dist/
├── dist/                         ← build çıktısı (git'e girmez)
└── node_modules/                 ← (git'e girmez)
```

**Altın kural:** `src/game/` React'ten habersizdir (hiçbir dosyası react import etmez, `useGame.js` hariç); `src/components/` oyun kuralı içermez, sadece state okur ve engine fonksiyonu çağırır. Yeni özellik eklerken bu ayrımı koru.

---

# 5. Architecture Explanation

**State:** Tek mutable obje `S` (`src/game/state.js`, modül-scope, oyun başlayana dek `null`). `newState(scenario)` üretir. Alanlar:
`scenario, day, secs, rank, rep, bold, inf, money, debtDue, inbox[], pool[], usedCrises[], openCase, dailyLog[], logEntries[], over` + UI alanları `infoOpen, event, summary, flash`.
(Eski `timer` alanı engine'de modül değişkeni oldu; eski `paused` bayrağı KALDIRILDI — pause türetiliyor, aşağıda.)

**Data flow (tek yön):**
```
Kullanıcı tıklar → component, engine fonksiyonunu çağırır (choose/resolveCrisis/...)
  → chance(o,c) ile % hesaplanır → Math.random() zarı
  → apply(fx) → S mutasyonu + log() + checkEndings()
  → checkPromotion() → notify() → useGame() abonesi tüm componentleri yeniden render eder
```

**Kurallar:**
- Stat değişimi SADECE `apply(fx)` üzerinden yapılır. `apply` senaryo modifierlerini (Legacy ×1.25) uygular, clamp'ler, loglar, ending kontrolü yapar. Elle `S.rep += x` YAZMA.
- Her S mutasyonundan sonra `notify()` çağrılır (eski `renderX()` çağrılarının karşılığı). Engine dışında S mutasyona uğratılmaz; componentler sadece okur.
- XSS/escape: JSX zaten kaçış yapıyor, eski `esc()` kaldırıldı. `dangerouslySetInnerHTML` KULLANMA.

**Pause (türetilmiş):** `isPaused()` = `S.infoOpen || S.event || S.summary`. Herhangi bir overlay açıkken sayaç durur; ayrı bir bayrak tutulmaz. (Eski "info paneli özet ekranının pause'unu bozuyor" bug'ı bu tasarımla ortadan kalktı.)

**Zaman/event sistemi:** `setInterval` (1 sn, engine'de) → `S.secs--` + `notify()`. Gün sonu `endDay()`:
deadline kontrolü → özet (`S.summary`) → [devam butonuna basınca `dismissSummary()` → cb] gün +1, REP −1, delayed case'ler `resolveDelayed()`, `drawCases(1-2)`, %50 disrespect mesajı (REP<30 ise), %60 kriz (`S.event`).

**Inbox item 3 tipte olabilir** (aynı dizide, flag'le ayrılır):
1. normal dava (tıklanır, `openCase` olur),
2. `pending`'li dava (cevap bekliyor, tıklanamaz),
3. `msg:true` (salt bilgi kartı, REPLY'lar ve disrespect mesajları).

**Delayed response tasarımı (önemli):** Zar SEÇİM ANINDA atılır (`c.pending={day, win, o}`), sonuç `resolveDelayed`'de sadece AÇIKLANIR. Bilinçli karar — state basit kalsın diye. Değiştirilecekse (ör. araya girme mekaniği) pending yapısı genişletilmeli.

**Overlay'ler ve paused:** `showEvent`/`showSummary`/`showInfo` `S.paused=true` yapar; kapanış handler'ları false'a çevirir. (Bilinen edge case: Bölüm 10.)

---

# 6. Code Style & Rules

- **Dil:** Tüm oyun içi metin İNGİLİZCE (kullanıcı kararı). Kod yorumları İngilizce. Kullanıcıyla iletişim Türkçe.
- **Naming:** camelCase fonksiyon/değişken; SCREAMING_SNAKE tuning sabitleri; state objesi kısaca `S`. Component dosyaları PascalCase.jsx.
- **Kompaktlık:** Oyun mantığı (`src/game/`) bilinçli yoğun yazılmış (tek satır guard'lar, ternary'ler) — aynı tarzda devam et. Componentler sade JSX; gereksiz abstraction/class/context ekleme.
- **Katman ayrımı:** `src/game/` react import etmez (`useGame.js` hariç); componentler oyun kuralı içermez (zar atma, stat hesabı vs. hepsi engine'de).
- **Yapma:**
  - Yeni runtime npm bağımlılığı ekleme (react/react-dom dışında; state kütüphanesi, UI kit vs. YASAK).
  - `localStorage` dışında storage varsayma; save eklenirse `localStorage` + JSON.
  - Ses dosyası/görsel asset ekleme — her şey prosedürel (SFX sentez, SVG runtime).
  - `apply()`'ı bypass edip stat değiştirme; engine dışında S mutasyonu.
  - `dangerouslySetInnerHTML` kullanma.
  - Oyun içi metinlerde "Suits/Papers Please" adı geçirme (parodi isimler serbest, doğrudan referans yasak — i panelinde de yok).
- **Tuning değerleri** hep `src/game/constants.js`'te veya `chance()` içinde — dağıtma.
- **Test:** Değişiklikten sonra `npm run build` (syntax + import hatalarını yakalar). Davranış testi `npm run dev` ile tarayıcıda elle.
- **CHANGELOG kuralı (kullanıcı isteği, 2026-07-06):** Her yeni versiyonda `README.md`'deki Changelog bölümüne DETAYLI bir giriş ekle (sürüm adı, tarih, commit, eklenen her özelliğin açıklaması). README İngilizce. Bu kural atlanmaz.
- **Push kuralı (kullanıcı isteği, 2026-07-06):** Commit/push'u kullanıcı kendisi yapmak isteyebilir — push'lamadan önce sor; istenirse sadece komutları hazırla.

---

# 7. Important Code Sections

**Başarı şansı formülü — oyunun dengesi buna bağlı, dikkatle değiştir:**
```js
function chance(o,c){
  if(o.base>=100) return 100;                       // safe seçenekler
  let p=o.base+(o.boldW||0)*(S.bold-40)/10*5;       // 40 üstü her 10 Bold = +boldW*5
  const j=c&&c.judge;
  if(j){
    if(o.style==="aggressive") p-=j.temper/4;
    if(o.style==="technical")  p+=j.book/5;
  }
  if(!o.safe){
    if(S.rep<30) p-=12; else if(S.rep>70) p+=5;     // saygı sistemi
    p-=S.rank*2;                                    // rütbe baskısı
  }
  return Math.round(clamp(p,5,95));
}
```

**Dava/seçenek veri şeması (AI üretimi de buna uyacak):**
```js
{ id:"nda", tier:1, title:"CASE: ...", deadline:3,   // deadline = gün sayısı (dueDay = day+deadline)
  judge:true,                                        // opsiyonel; true ise JUDGES'tan rastgele atanır
  body:"...(kazandıran ipucu metnin İÇİNDE saklı olmalı)...",
  opts:[
    { text:"...", base:100, safe:true,               // safe: yeşil, asla fail olmaz
      ok:{fx:{inf:2,bold:-4}, txt:"..."} },
    { text:"...", base:78, style:"technical", delay:2,  // delay: cevap N gün sonra
      ok:{fx:{rep:8,inf:7,money:1200}, txt:"..."},
      fail:{fx:{rep:-5}, txt:"..."} },
    { text:"...", base:35, boldW:3, style:"aggressive", // boldW: Boldness ölçekleme ağırlığı (1-3)
      ok:{...}, fail:{...} } ] }
```
fx anahtarları: `rep, bold, inf, money`. `ok.fx` toplam rep+inf ≥ 10 ise "HENDERED!" flash'i patlar.
Her `ok`/`fail` opsiyonel `next:{after:N, note:"log satırı", case:{...tam dava objesi...}}` taşıyabilir — çok aşamalı dava zinciri (v0.6): sonuç gerçekleşince `case`, N gün sonra inbox'a takip dosyası olarak düşer.

**apply() — Legacy modifieri dahil tüm stat mutasyonu:**
```js
if(S.scenario==="legacy"){
  if(k==="inf"&&v>0) v=Math.round(v*1.25);
  if(k==="rep"&&v<0) v=Math.round(v*1.25);
}
```

**SFX — hazır çözüm, yeniden yazma:** `tone(freq,dur,type,vol,when)` tek osilatör + gain envelope. Yeni efekt = frekans dizisi map'le (`SFX.promo` örneğine bak). AudioContext ilk kullanıcı jestinde `ac()` ile lazy açılır (autoplay policy).

**Ofis SVG (`src/components/OfficeScene.jsx`, `buildScene()`):** `rect(x,y,w,h,color)` yardımcısıyla 320×64 viewBox'a piksel blok dizer, JSX `<rect>`'lere map'lenir. Rütbe → duvar/zemin rengi, pencere sayısı, masa genişliği, prop'lar (bitki r≥1, diploma+nameplate r≥2, koltuk+viski r≥3, duvar yazısı r=4). REP<30 → tabure + "someone's lunch". Yeni prop eklerken bu fonksiyona rect satırı ekle, dışarıda asset arama.

---

# 8. Assets & Design

- **Asset dosyası SIFIR.** Font CDN'den, sesler sentez, grafikler CSS+SVG.
- **Grafik tarzı:** Piksel/retro. Font `Press Start 2P` (8-10px). Palet `:root`'ta: lacivert zeminler (`--bg #1a1c2c`, `--panel #29366f`), altın vurgu (`--gold #ffcd75`), yeşil=güvenli (`--green`), kırmızı=risk (`--red`), dava kağıdı krem (`--paper #f2e9d8`). CRT hissi için `body::after` scanline overlay. `image-rendering:pixelated` global.
- **UI:** 3 sütun — INBOX (sol), CASE FILE/DESK (orta, kağıt görünümü), ASSOCIATE FILE (sağ: stat barları + log). Üstte topbar + ofis sahnesi bandı. Topbar'da saatin yanında süre barı: gün ilerledikçe kısalır (altın → ≤30sn kehribar → ≤15sn kırmızı, saat rakamı da kırmızıya döner). Buton renk kodu: yeşil=safe, mavi=nötr, kırmızı=aggressive/blöf. Her butonun altında küçük altın satırla % ve etiketler.
- **Animasyon:** `.flash` (HENDERED!/PROMOTED! pop), stat barı `width .3s`, karakter yürüyüşü (`char-leave/arrive` CSS keyframe), ekran sarsıntısı (`.shaking`, App'te fail'de replay, `settings.shake` gate). Başka animasyon sistemi yok, gerekmedikçe ekleme.
- **Ses:** `SFX.{click,open,win,lose,promo,fired,bell,tick,send,crisis}` + prosedürel lo-fi ambiyans (v0.9: 4 akorluk Web Audio döngüsü + noise cızırtısı, `startAmbience/stopAmbience`). Topbar'da SFX ve BGM ayrı toggle'lar; BGM tercihi `localStorage`'da. Ses dosyası hâlâ SIFIR.

---

# 9. Game Mechanics

- **Player:** 4 stat. REP (başlangıç 50; <20 kovulma; her gece −1; <30 disrespect, >70 respect), BOLD (40; blöf şansını besler, safe seçenekler kemirir), INF (10; terfi para birimi), MONEY ($1500, Debtor'da $3000).
- **"Enemy" karşılığı:** Karşı taraf ayrı bir AI değil — zorluk `chance()` formülü + hakim statları + kriz eventleri üzerinden. Rakip firma Snidely Fitch flavor + bazı davaların konusu.
- **Level karşılığı:** Rütbeler. `checkPromotion()`: `inf >= RANK_REQ[rank]` oldukça yüksel (while ile zincirleme terfi mümkün). Rütbe 4 = win. Tier-2 (mahkeme) davaları rank≥1'de havuza girer (`drawCases` filtresi).
- **Combat karşılığı:** Dava çözümü — oku, seç, zar. Zar: `Math.random()*100 < chance(o,c)`.
- **Progression:** Influence→rütbe→daha iyi ofis (görsel) + daha zor davalar (rank başı −2 şans) + daha büyük kriz maruziyeti.
- **Physics:** YOK (bilinçli).
- **Controls:** Fare/tık + klavye (v1.1): 1-4 seçenek, Space defer/özet ilerlet, Esc panel kapat.
- **RNG kuralı (v1.1):** Oyun mantığında `Math.random` YASAK — `utils.js`'ten `rand()`/`rnd()` kullan (daily modun determinizmi buna bağlı). Tek istisna `sound.js`.
- **Rakip (nemesis):** İsimli associate seninle yarışır; gece + senin fail'lerinden INF kazanır, önce Name Partner olursa `OUTPACED` game over (`nemesisGain`, engine.js).
- **Ayarlar (`settings.js`):** run save'inden AYRI global tercihler (`fo_settings_v1`): dayLen 60/75/90, sfx/bgm ses seviyesi, ekran sarsıntısı. Sound bunları okur.
- **Ekonomi/zorluk sabitleri:** `DAY_SECONDS=75`, `REP_FIRED=20`, `DEADLINE_PENALTY=-9`, `RANK_REQ=[30,55,80,95]`, kriz olasılığı `.6`, ikinci günlük dava olasılığı `.6`, gece REP çürümesi `-1`, Debtor taksiti `$2000/3 gün`, `STAKE_REWARD=[1,1.15,1.3,1.45,1.6]`, `STAKE_PENALTY=[1,1.3,1.6,1.9,2.2]`, `PRICES={suit:1200(×1.5 artar), detective:900, marv:600}`, `WEEK_LEN=5`, `REVIEW_GOOD=10`, `REVIEW_BAD=0`.
- **Inventory:** Hâlâ yok ama para artık harcanabiliyor (EXPENSES: suit/Marv; dosya başına dedektif).

---

# 10. Current Problems / TODO

**Bilinen buglar (küçük, oyun kırıcı değil):**
1. ~~openCase deadline referansı~~ — React geçişinde FIX'LENDİ (`endDay` başında `if(missed.includes(S.openCase)) S.openCase=null`).
2. ~~Info paneli özet pause'unu bozuyor~~ — React geçişinde tasarımla ORTADAN KALKTI (pause artık türetiliyor: `isPaused()` = herhangi bir overlay açık mı; test edildi).
3. ~~Dava havuzu tekrarı~~ — v0.4'te FIX'LENDİ: havuz tükenince (veya gün>3'te %40) `casegen.js` üretiyor, reset yok.
4. ~~`RANK_REQ[3]=100` kilidi~~ — v0.6'da FIX'LENDİ: eşik 95'e çekildi (INF tavanı 100).

**Optimizasyon:** Gerek yok (tek dosya, ~700 satır, render yükü önemsiz). `renderAll()` her olayda tüm panelleri yeniden çizer — bilinçli basitlik, dokunma.

**Planlanan özellikler (kalanlar; başlamadan kullanıcıya sor):**
1. ~~NPC ilişki sistemi~~ — v0.4'te EKLENDİ.
2. ~~Dava havuzunu büyütme~~ — v0.4/v1.0'da EKLENDİ (12 şablon). NOT: AI/LLM ile üretim BİLİNÇLİ olarak reddedildi — kullanıcı API anahtarının oyuna gömülmesini istemiyor; oyun her makinede offline dava üretmeli. Bu kararı değiştirme.
3. ~~Çok aşamalı davalar~~ — v0.6'da EKLENDİ (`next` zincirleri).
4. ~~Save/load + run istatistikleri~~ — v0.5/v1.0'da EKLENDİ (+run ledger).
5. ~~Para harcama yerleri~~ — v0.5'te EKLENDİ (suit/dedektif/Marv).
6. ~~Haftalık ritim~~ — v0.8'de EKLENDİ (cuma partner review'ı).
7. ~~Ses/müzik genişletme~~ — v0.9'da EKLENDİ (prosedürel lo-fi ambiyans).
8. ~~Terfi geçiş sahnesi, rakip associate, Marv büyütme, ayarlar paneli~~ — v1.0'da EKLENDİ.

**Backlog (kullanıcının onayladığı sıradaki işler + bekleyenler; başlamadan sor):**
- **Dava arşivi** — run içinde çözülen davaların dökümü (hangi seçenek, sonuç); REPLY'ların hangi davaya ait olduğu sorununu da çözer. (KULLANICI ONAYLADI, sıradaki)
- **NPC hikâyeleri** — rel eşiklerinde tetiklenen mini-sahneler (Dana'nın sırrı, Katrina'nın teklifi). (ONAYLANDI)
- **Rakiple etkileşim** — nemesis'e sabotaj/ittifak seçenekleri. (ONAYLANDI)
- **Hakim hafızası** — aynı hakime ikinci çıkışta geçmişi hatırlama ("geçen sefer blöf yaptın, −5"). (ONAYLANDI)
- **Mobil yayın** — önce mobil layout geçişi (3 sütun → sekmeli görünüm, 44px dokunma hedefleri, safe-area, visibilitychange pause), sonra **Capacitor** sarmalama (Electron'un mobil karşılığı; oyun mantığına dokunulmaz). iOS'ta localStorage yerine Capacitor Preferences. (ONAYLANDI, yukarıdakilerden sonra)
- ~~4. senaryo, başarımlar, oyun modları, klavye kısayolları~~ — v1.1'de EKLENDİ.
- **GitHub Pages demo yayını** — `dist/`i yayınlayan tek workflow; oyun linkle paylaşılabilir olur.
- **Steam paketleme:** `electron-builder` (.exe/.app) + `steamworks.js` (achievements — `achievements.js` 1:1 map'lenmeye hazır).
- **Multiplayer** (en son; server ister, GDD §11).

---

# 11. Previous Decisions

| Karar | Gerekçe | Değiştirilebilir mi? |
|---|---|---|
| ~~Tek dosya, vanilla JS~~ → **React 18 + Vite 5** (2026-07-05) | Kullanıcı Steam hedefiyle birlikte "reacte geçir, dışarıdan bakan neyin nerede olduğunu anlasın" dedi; mantık `src/game/` (saf JS), UI `src/components/` olarak ayrıldı | Kullanıcı kararı; geri dönüş yok. Eski tek dosya sürüm git geçmişinde (commit "v2") |
| State: mutable `S` + notify() store, Redux/Zustand yok | Oyun mantığı 1:1 port edildi, denge riski sıfırlandı; ekstra bağımlılık yasağı sürüyor | Yeni state kütüphanesi eklenmez |
| Oyun dili İngilizce | Kullanıcının açık kararı ("dili ingilizce olsun") | Sorulmadan değiştirme |
| Web deploy = `npm run build` çıktısı (`dist/`) | Vite girişi kök `index.html`; Pages'e artık dist atılır | Koru |
| Safe=%100 ama Boldness yer / blöf=Boldness'a bağlı / fail=REP yakar | Oyunun çekirdek gerilimi, kullanıcının orijinal tasarımı | ASLA değiştirme |
| Delayed zar seçim anında atılır | State basitliği | Yeni mekanik gerektirirse genişletilebilir |
| Parodi isimler (Parson Henderson, Lou Bitt, Snidely Fitch, HENDERED) | Suits göndermesi ama telif-güvenli | Koru; gerçek isim kullanma |
| i panelinde ilham kaynakları anılmaz | Kullanıcının açık isteği | Değiştirme |
| AI dava üretimi v1'e alınmadı, elle yazılmış havuz | Prototip hızı; şema AI-hazır tasarlandı | Sıradaki adaylardan |
| Zorluk v0.2'de artırıldı (75sn, eşik 20, −9, %60 kriz, gece −1 REP, rütbe baskısı) | Kullanıcı "biraz daha zorlaştır" dedi | Tuning açık; toptan geri alma |
| Ofis sahnesi inline SVG, asset yok | Tek dosya kuralı + piksel estetik | Koru |
| Rep<30 cezası −12 / Rep>70 bonusu +5 | Saygı sistemi kullanıcı isteği; sayılar ilk tahmin | Tuning serbest |
| Denenip vazgeçilen: yok | İlk fikir seti doğrudan uygulandı; kesilen tek şey v1 kapsam kısıtlarıydı (NPC/delege/AI/multiplayer sonraya) | — |
| Steam dağıtımı için Electron wrapper (2026-07-05) | Kullanıcı Steam'e çıkmak istiyor; dil/engine değiştirmek yerine web oyununu Electron'a sarma seçildi (Tauri ve Godot/Unity portu elendi). Electron `dist/` build'ini yükler | Wrapper detayları (pencere boyutu vs.) serbest |
| Dava üretimi PROSEDÜREL, LLM/API DEĞİL (v0.4) | Kullanıcının açık isteği: "Claude API key oyunun içerisinde entegre olmasın", oyun her makinede offline üretsin | Kullanıcı istemeden AI üretimine dönme |
| NPC traitleri gizli başlar, her run'da 4 traitin her birinden bir tane | Keşif oynanışı + her run'da "Traitor kim?" gerilimi | Tuning serbest; gizlilik mekaniği korunmalı |
| PAUSE ekranı masayı tamamen kapatır | Açık dosyayı bedava okumak timer gerilimini öldürürdü | Koru |
| Karakter yürüyüş animasyonu CSS keyframe (SVG `<g>` üzerinde), JS animasyon kütüphanesi yok | Bağımlılık yasağı + basitlik | Koru |
| Zorluk = bilgi bulanıklığı, zar matematiği DEĞİL (v0.7) | Kullanıcı isteği; aralık merkezden kaymalı + stabil olmalı ki ortası/titremesi gerçek değeri sızdırmasın | Aralık genişlikleri (FUZZ) tuning serbest; "zar değişmez" ilkesi korunur |

---

# 12. Claude Code Startup Instructions

Sen bu projeye yeni katılan geliştiricisin. Şunları bilmelisin:

1. Proje `fancy-outfits/` klasöründe; React 18 + Vite 5. Oyun mantığı `src/game/` (saf JS, React'ten bağımsız), UI `src/components/`. `FANCY_OUTFITS_GDD.md` gelecek özelliklerin spec'i, bu `CLAUDE.md` tam bağlam.
2. Çalıştırmak: `npm run dev` (tarayıcı), `npm start` (Electron/Steam hedefi). Her değişiklikten sonra `npm run build` ile doğrula, davranışı tarayıcıda elle test et.
3. Dokunmadan önce oku: `src/game/engine.js` içinde `chance()` (denge), `apply()` (tüm stat mutasyonu buradan) ve `endDay()` (gün akışı); dava JSON şeması (CLAUDE.md §7, gerçek veri `src/game/content.js`).
4. Kırmızı çizgiler: yeni runtime bağımlılığı/asset dosyası ekleme; oyun metinlerine "Suits/Papers Please" yazma; safe-vs-bluff çekirdek gerilimini bozma; `apply()`'ı bypass etme; `src/game/` ↔ `src/components/` katman ayrımını bozma; oyun dili İngilizce kalır, kullanıcıyla Türkçe konuşulur.
5. İlk iş adayları: §10'daki kalan buglar (#3, #4) ve kullanıcıya §10'daki özellik listesinden hangisini istediğini sormak. Muhtemel cevap NPC ilişki sistemi (spec: GDD §5) — ama başlamadan onay al.
6. Kod stili: `src/game/` kompakt (tek satır guard'lar, ternary'ler), tuning sabitleri `constants.js`'te; componentler sade JSX.
