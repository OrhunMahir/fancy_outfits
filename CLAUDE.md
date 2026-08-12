# FANCY OUTFITS — Project Handoff Document

> Bu dosya `CLAUDE.md` olarak proje kökünde durduğu için Claude Code tarafından otomatik okunur.
> Amaç: bu projeye sıfırdan katılan bir geliştiricinin (insan veya AI) hiçbir bağlam kaybı olmadan devam edebilmesi.

---

# 1. Project Overview

**Oyun:** FANCY OUTFITS — Suits dizisinden esinlenen, piksel görünümlü bir avukatlık kariyer simülasyonu.

**Tür:** Metin ağırlıklı karar/simülasyon oyunu (narrative decision game + time management). Yürüme/3D/fizik YOK. Oyuncu masasında oturur, dava dosyaları okur, replik seçer.

**Platform:** Tarayıcı. Tek dosya (`index.html`), sunucu/build gerektirmez. Çift tıkla açılır. GitHub Pages'e atılırsa direkt yayınlanır (dosya adı bu yüzden `index.html`).

**Core gameplay loop:**
1. Gün başlar → kurgusal mesai günü 09:00'da açılır (varsayılan 8 saat; v1.5'te gerçek zamanlı sayaç KALDIRILDI — okumak bedava, İŞ YAPMAK saat yakar).
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
- 10 el yazması dava (3 tier: 0=ayak işi, 1=gerçek dava, 2=mahkeme); Redvale dosyasında 4. seçenek olarak ilk interaktif COVERT ACTION bulunur.
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
- **Prosedürel dava üreticisi** (`casegen.js`): API YOK, ağ YOK — kullanıcının açık isteği ("Claude API key oyuna entegre olmasın"). 7 şablon × isim/rakam/ipucu havuzları; el yazması dava havuzu tükenince veya 3. günden sonra %40 ihtimalle devreye girer. Eski bug #3 (havuz tekrarı) böylece çözüldü.
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
- **Başarımlar (`achievements.js`, `fo_ach_v1`):** 11 adet, run'lar arası kalıcı, start ekranında listelenir (■/□). `unlock(id)` ilk açılışta true döner; engine `ach(id)` ile log+SFX.bell fanfarı basar. Kancalar: gameWin (win/realistic/nosafe/defector/boomerang/ironman/bold≥65), delegateCase (Traitor'a 5.), choose (bribeW≥3), cuma övgüsü, gün≥15. İleride Steamworks'e 1:1 map'lenecek.
- **Oyun modları (`S.mode`, start ekranında seçilir):** standard / **ironman** (saveGame no-op — kayıt yok) / **endless** (gameWin ilk seferde `S.endlessWon=true` + "KEEP BILLING" özeti, run devam eder; nemesis rank 4'e çıkamaz; `recordRun` `S.runRecorded` ile tek sefer sayar) / **daily** (tarih hash'i `setSeed`'e verilir, senaryo tarihten seçilir, zorluk MEDIUM'a kilitli, `S.dailyDate`).
- **Deterministik RNG (`utils.js`):** mulberry32 tabanlı `rand()/setSeed()/clearSeed()`. TÜM oyun mantığı artık `rand()` kullanır — `Math.random` SADECE `sound.js`'te kalır (ses jitter'ı deterministik akışı tüketmesin). Yeni kod yazarken bu kurala uy.
- **Klavye kısayolları (App.jsx `handleKey`):** 1-4 seçenek seçer (dava + kriz; paran yetmeyen bribe yok sayılır), Space dosya erteler/özeti ilerletir, Esc panelleri kapatır. Seçenek metinleri numaralandı. Handler modül `S`'ini okur (stale closure yok), sadece engine fonksiyonu çağırır.

**v1.2 eklendi (2026-07-09, kullanıcı isteği):**
- **4. stat: FIRM (`S.firm`, start 62):** `apply()` fx'ine `firm` anahtarı eklendi (scaleStakes de ölçekler). Kaynaklar: dava kazanma/kaybetme ±1 (tier≥1), deadline −2, kriz fail −2, cuma review ±3, kovma morali −2, lawsuit fx'leri. StatsPanel'de 4. bar. **Batış:** Name Partner iken (endlessWon||rank 4) `firm < FIRM_COLLAPSE(15)` → `gameOver("FIRM COLLAPSE")` — pratikte ENDLESS'ın endgame'i.
- **Payroll / FIRM sekmesi (`RosterOverlay`, topbar'da FIRM butonu — sadece roster varken):** endless'ta NP olunca `buildRoster(npcs,nemesis)` (npcs.js) ~13 kişi kurar: 4 floor NPC + nemesis + Hardwick(senior) + Lou Bitt + 6 üretilmiş. Alanlar: `{won,lost,impact(-3..4),senior,src}`. `rosterTick()` her sabah: her çalışan %30 ihtimalle iş yapar (kazanma şansı 50+impact×8) → won/lost işler + FIRM drift (clamp ±3).
- **Kovma (`fireEmployee`):** senior olmayan direkt; **Senior Partner = oylama** (`voteChance` = 30+rep/2+inf/4, clamp 20-90; fail: −6 REP −3 FIRM). Kovulan floor NPC'si `S.npcs`'ten de düşer (delege hedefi azalır); nemesis kovulabilir (`S.nemesis=null`). Moral: her kovma −2 FIRM.
- **Dava ısısı (`litigationTick`):** kovma başına `FIRE_HEAT(9)` / senior `16`; gece `×HEAT_DECAY(0.93)`, `everFired` olduysa taban `HEAT_MIN(1)` — ASLA 0 olmaz (kullanıcı isteği). Sabah `min(30,heat)%` ihtimalle `buildLawsuit(firedNames'ten)` (casegen.js) inbox'a düşer (tier2, judge, `suit:true`, fx'lerde firm), spawn ısıyı yarılar.
- **Partnership buy-in:** rank 2→3 için INF eşiği + `BUYIN_COST(5000)`. `checkPromotion` rank 2'de `buyinPaid` yoksa DURUR (tek seferlik hint loglar); EXPENSES'te BUY-IN butonu → `payBuyIn()` → terfi devam eder.

**v1.3 eklendi (2026-07-09, kullanıcı isteği — "müşteri KAZANILIR, verilmez"):**
- **Client list (`clients.js` — saf modül, mutasyonlar engine'de):** 20 parodi marka havuzu (Abibas, Mike Sportswear, McRonald's, Guccy, Goggle, Tesler Motors…). `S.clients[{name,fee}]` + `S.clientPool`. Kapasite `CLIENT_CAP(rank)=3+rank*2` ama SADECE tavan — terfi otomatik müşteri VERMEZ.
- **Başlangıç:** fraud/debtor 0 müşteri ("Win loudly — they'll find you"); legacy 1 (aile dostu), defector 1 (Fitch'ten getirdiği). Kullanıcının açık isteği: sıfırdan başlayan modda müşteri yok.
- **Kazanım yolları (hepsi REP'e bağlı):** (a) tier≥1 dava kazanınca `maybeImpressClient` — şans `clamp((rep-45)*.004,0,.14)`, "We were impressed. Represent us." mesajı; (b) sabah `clientAcquisition` — şans `clamp((rep-50)*.0033,0,.12)`: %50 emekli partner hesabını bırakır (INHERITANCE msg, rep≥55 şart) / %50 `buildDinnerEvent` yemek daveti eventi (kazanırsan imza).
- **Kayıp:** tier≥1 dava fail'inde `maybeLoseClientOnFail` — %12 (+%8 rep<30) rastgele müşteri gider ("Nothing personal. Everything reputational.").
- **Cuma retainer'ları:** `sum(fee)` ödenir; 0 müşteri cezası (−4 FIRM) SADECE rank≥2'de, junior'lara kuru uyarı satırı.
- **Global eventler NADİR (%7, tekrarlanabilir, usedCrises'e girmez):** g_bankrupt/g_poach/g_scandal (g_prospect kaldırıldı — kazanım yollarına dönüştü). Sonuçlar `client:{lose:name}/{gain:true,double?}` taşır; `resolveCrisis` işler.

**v1.4 eklendi (2026-07-10, kullanıcı isteği):**
- **Günlük hedefler:** her sabah `newObjective()` — `OBJ_DEFS` (engine.js): close/wins/nosafe/aggwin/deleg(rank≥1)/money. Ödül rastgele: {inf:6}/{inf:8}/{rep:5}/{firm:5}/{inf:4,rep:3}. Sayaçlar `S.today` (trackChoice + resolveDelayed/Delegated + delegateCase + apply money>0). Gün sonunda tutarsa ödül + "DAILY GOAL MET" satırı; tutmazsa ceza YOK, kuru not. StatsPanel'de canlı ilerleme (`objectiveInfo()`). ÖNEMLİ: delayed dava'nın gizli sonucu reveal olana dek "win" hedefine SAYILMAZ (bilgi sızmasın — zorluk modlarıyla tutarlı).
- **Dava arşivi (`S.archive`, topbar LOG butonu → `ArchiveOverlay`):** her çözülen dosya `archiveCase()` ile kaydedilir: gün, başlık, oynanan seçenek, WON/LOST, sonuç metni, via etiketi (delayed reply / delegated / favor / deadline missed). Delayed dosyalar SEÇİMDE değil reveal'da arşivlenir. REPLY-hangi-davaydı sorunu çözüldü.

**v1.4.1 eklendi (2026-07-10, kullanıcı isteği):**
- **3 save slotu:** `fo_save_v1_s1/s2/s3` + aktif slot `fo_slot` (engine modül değişkeni `activeSlot`, `getSlot/setSlot`). `S.slot` run'a yazılır; saveGame/peekSave(n)/loadGame(n)/clearSave slot bazlı. Eski tek kayıt otomatik slot 1'e taşınır (tek seferlik migration, engine import'unda). Start ekranında SLOT seçici (gün gösterir) + "CONTINUE SLOT n". Yeni run seçili slota yazar (doluysa ilk kayıtta ezer — slot etiketi günü gösterdiği için bilinçli).
- **Restart:** SettingsOverlay'de iki adımlı onaylı "RESTART RUN" → `restartRun()` (slotu siler + reload).
- **Fullscreen:** Electron `fullscreen:true`.
- **Kaydırmasız yerleşim:** `#approot` dikey flex, `height:100%`, `body{overflow:hidden}`; topbar+scene sabit bant, `#main flex:1 min-height:0`, üç kolon `overflow-y:auto` (sayfa DEĞİL kolon kaydırır). ≤900px'te eski yığılmalı düzene düşer (media query) — mobil geçişin temeli.

**v1.5 eklendi (2026-07-10, kullanıcı isteği — ZAMAN SİSTEMİ TAMAMEN DEĞİŞTİ):**
- **Gerçek zamanlı sayaç KALDIRILDI** (setInterval/timerId/S.secs/SFX.tick yok). Gün = kurgusal mesai (09:00→17:00, `settings.dayLen` artık SAAT: 6/8/10, eski saniye değerleri migrate edilir). `S.hours` kalan saat; iş yapmak saat yakar: `hoursFor(c)=TIER_HOURS[tier]` (1/2/3h), delege 0.5h, delayed gönderim de tier maliyeti öder. Alışverişler bedava. Topbar: duvar saati (`wallTime()`), kalan saat, bar; END DAY → "GO HOME".
- **Mesai:** saat 0'a inince `checkClock()` QUITTING TIME overlay'i açar (event id "overtime", `o.home/o.ot` bayrakları `resolveCrisis` başında intercept edilir): eve git (endDay) veya +`OVERTIME_HOURS`(2) karşılığı +`OVERTIME_FATIGUE`(12). Tekrarlanabilir.
- **FATIGUE statı (5. bar, mor):** her iş saat×2 yorgunluk; `chance()`'te safe olmayanlara `-round(fatigue*.15)` (tavan −15). Gece `FATIGUE_REST`(22) + kullanılmayan saat×3 kadar düşer ("Leaving early helped."). Save'e girer; eski save'lere loadGame backfill.
- **Patron angaryaları (`buildDemand`, npcs.js):** istekler SADECE üst rütbeden gelir (BOSSES rank>playerRank filtresi — rank 3+'ta kimse kahve isteyemez, rank 4'te null). Aksiyon sonrası %10 (`maybeDemand`, saat>0.5 iken). Kabul: `o.hours/o.fatigue` maliyeti + 2 INF; ret: −3 REP; "stajyeri gönder" kumarı (45%). Kriz seçeneklerinde `hours/fatigue` alanlarını `resolveCrisis` işler.
- **PAUSE kaldırıldı** (sayaç yokken anlamı yok): buton, PauseOverlay.jsx ve pauseGame/resumeGame silindi. `isPaused` UI-gating için duruyor.

**v1.5.1 eklendi (2026-07-10, kullanıcı şikayeti: "çok kolay, 10-11 günde bitiyor, saatler hiç bitmiyor, hep en yüksek şanslıyı seçmek yetiyor"):**
- **İş yükü:** gün 1'de 3 dosya; sabahları `2+(60%?1)+(rank≥2&&50%?1)` → 2-4 dosya; favor %30→35, angarya %10→14. Saat bütçesi artık gerçekten zorlanıyor.
- **INF ekonomisi:** `INF_EARN=0.6` — TÜM dava INF ödülleri instantiate'te ×0.6 (min 1, `scaleStakes` içinde); `STAKE_REWARD` artık SADECE money/bold'u büyütür (INF snowball'u kırıldı; dosyada "×a fees / ×b fallout"); gece INF çürümesi `INF_DECAY=[1,1,2,2,2]` (rütbeye göre); `RANK_REQ=[35,60,85,95]`; günlük hedef ödülleri {inf:4}/{inf:5}/{rep:4}/{firm:4}/{inf:3,rep:2}.
- **Risksiz spam kırıldı:** `chance()`'te safe olmayan HER seçeneğe global −4 ("opposing counsel exists") — rütbe baskısı ve yorgunlukla üst üste biner.
- Krizler/favorlar/angaryalar INF ölçeklemesinden MUAF (instantiate edilmezler) — büyük INF artık bilinçli risklerden gelir.

**v1.6 eklendi (2026-07-12, kullanıcı isteği):**
- **NPC hikâyeleri (`STORIES`/`buildStory`, npcs.js):** rel≥40 olan ilk NPC'nin sahnesi ertesi sabah event olarak tetiklenir (run başına 1 kez, `S.npcStories`). 4 sahne: Dana'nın kara defteri, Raquel'in gizli baro sınavı, Harold'ın gece yarısı krizi (bir seçenek `hours/fatigue` maliyetli), Katrina'nın ortaklık teklifi. Seçeneklerdeki `relOk/relFail`'i `resolveCrisis` işler (`ev.npc` üzerinden).
- **Kahve (`buyCoffee`, EXPENSES):** $120, azalan etki `COFFEE_RELIEF(14)−COFFEE_FALLOFF(6)×cupToday`, taban `COFFEE_MIN(2)`; `S.coffeeToday` her sabah sıfırlanır.
- **Arşiv detayı:** `archiveCase` artık `body` + `judge` saklar; ArchiveOverlay satırları tıklanınca açılır (▶/▼), dava metni + hakim + sonuç gösterir.
- **Balance sertleşmesi:** yorgunluk cezası ×.15→×.25 (tavan −25); `FATIGUE_REST` 22→18; dava akışı sabah `3+(40%?1)+(rank≥2&&40%?1)` → 3-5; **dikkatli oyun yavaştır**: `optHours` — safe ×1.5 saat (+2 ekstra yorgunluk), technical ×1.25, aggressive ×1 (seçenek etiketlerinde saat maliyeti görünür; dosyada "BASE TIME").

**v1.7 eklendi (2026-07-12, kullanıcı isteği):**
- **Rakip etkileşimi (engine):** StatsPanel RIVAL bloğunda hamleler — 2 günde 1 hamle (`S.rivalMoveDay`), saat maliyetli. SABOTAGE 1h: şans `50+(bold-40)/2−(grudge?10)`, başarı rakip INF −6/8/10; yakalanma −10 REP + `nemesis.grudge=true` (kalıcı). TRUCE 0.5h (%70): 4 gün pakt. ALLY 1h (şans `40+infFarkı`): 3 gün, her sabah İKİSİ de +1 INF; ret −4 REP. Pakt (`S.rivalPact`) aktifken `nemesisGain(fromFailure)` çalışmaz.
- **Rakip misillemesi (`rivalTick`, sabah):** pakt yoksa %12 (+%8 grudge) — dosyan ya POACHED (inbox'tan gider, rakip +4 INF) ya TAMPERED (`c.tampered` → riskli seçenekler −6%, dosyada kırmızı uyarı).
- **Hafta sonu kartı (`buildWeekend`, content.js):** her cumartesi sabahı ((day−1)%5===0) event: Sleep (−30 FATIGUE, `o.fatigue` negatif), Golf (−$200 kumar; kazan-kaybet −10 FATIGUE `o.fatigue`; ok'ta `golf:true` → `S.golfEdge` → SONRAKİ judge'lı dosya otomatik dossier), Office (+2h Pazartesi, +10 FATIGUE, `o.hours` negatif). Kriz bloğuna `!S.event` guard'ı eklendi (öncelik hafta sonunda).
- FIX: content.js'e eksik `rnd` importu eklendi.

**v1.7.1 eklendi (2026-07-12, kullanıcı isteği):** **Geceye sarkma onayı** — `choose()` başında `optHours > S.hours (>0)` ise dava ÇÖZÜLMEDEN "latework" onay eventi açılır (`S.pendingChoice` transient, save'de soyulur): "Push through" → `choose(c,o,true)` devam eder, taşan saat başına `LATE_FATIGUE(5)` ekstra yorgunluk + log satırı; iş bitince saat ≤0 olduğundan QUITTING TIME promptu doğal zincirlenir. "Step back" → dosya masada kalır, maliyet yok. `resolveCrisis` başında `o.lateGo/o.lateNo` intercept'leri.

**v1.8 eklendi (2026-07-12, kullanıcı isteği):**
- **5. senaryo "The Boomerang":** startGame'de rep 42 / inf 18 / marvBribes 1 / weekStart eşitlenir / TÜM npc rel −25. Perk: delege gün 1'den açık (`delegateCase` + CasePane gate'lerinde `scenario==="boomerang"` muafiyeti). Özel kriz `oldfile` (day≥3). DAILY rotasyonuna girdi (h%5).
- **Ofis dekoru (`DECOR`, constants):** fish $800 (+3 gece dinlenme), art $600 (cuma +1 INF satırı), espresso $1500 (`coffeeCost()` 120→40), monitor $700 (`optHours` −0.25, taban 0.5). `S.decor{}` (loadGame backfill); `buyDecor(id)` tek seferlik; StatsPanel "OFFICE DECOR" bölümü (alınan → yeşil "owned"); OfficeScene `buildScene(r,rep,decor)` her eşyayı çizer (tablo pencere arası x87, akvaryum x46, espresso x68, 2. monitör masada).

**v1.8.1 eklendi (2026-07-12, kullanıcı isteği — oranlar kullanıcının: 80→%30, 100→%100):**
- **Yorgunluk tehlike sistemi (`fatigueCheck`, engine):** FATIGUE > `FATIGUE_DANGER`(75) iken çalışılan HER SAAT sakarlık zarı atar — saat başı şans `hazardPerHour()=(fatigue−75)×4+10` (76→14, 80→30, 90→70, 95→90, **100→100 kesin**); çok saatlik iş bileşik: `1−(1−p)^saat`. Çağrı noktaları: choose (iki dal), delegateCase, kriz chore'ları (o.fatigue>0), overtime kabulü.
- **Sonuç:** 6 kazalık INCIDENTS havuzundan biri + üst rütbeli biri (`bossAbove`, npcs.js — rank 3+'ta kimse yok → "kendini eve gönderirsin") + `SENTHOME_REP(−6)/SENTHOME_INF(−4)` + zorunlu `endDay()` (günün kalan deadline'ları yanar — asıl diş bu). Özette `S.sentHomeNote` satırı (100'de "COLLAPSE ... your body filed its own motion — granted"). StatsPanel FATIGUE etiketi >75'te "⚠ n%/h sent-home risk" gösterir.

**v1.9 eklendi (2026-07-12, kullanıcı isteği):**
- **THE {CLIENT} WAR (`buildBigMatter`, casegen.js):** rank≥1 + müşteri varken sabah %10 (day≥4, `bigDoneDay+4` cooldown, tek aktif — `S.bigCase={client,stage}`) müşterilerinden birine 3 aşamalı savaş başlar. Aşamalar `next:{after:4}` ile zincirlenir (s1 tier1 → s2/s3 tier2+judge, iç içe veri). Her aşamada safe = erken uzlaşma (zincir YOK, savaş biter) / technical+aggressive kazanımı sonraki aşamayı kuyruklar.
- **Final ödülü:** ok'ta `client:{boost:name}` — `choose()` işler: `fee=min(800,fee*2)` + "RETAINER DOUBLED" logu. Kayıplar/erken çıkış/deadline kaçırma `S.bigCase=null`+`bigDoneDay` (yeni savaş için cooldown).
- **Kurallar:** war dosyaları delege edilemez (`c.big` guard); deadline kaçarsa savaş ölür; savaşın müşterisi giderse (`loseClient` kancası) savaş + sahnedeki stage dosyası birlikte çözülür. Inbox/CasePane'de altın "RETAINER MATTER · STAGE n/3" etiketi.

**v1.9.1 eklendi (2026-07-12, oyun taraması sonrası denge/temizlik):**
- **A1 — Delege dengesi:** delege kazanç INF'i artık `×INF_EARN(0.6)` (engine.js resolveDelegated); günde en fazla `DELEGATE_CAP(2)` delege (`S.today.delegated` guard, delegateCase). Reliable-NPC delege spam'i kapandı — v15.1'in risksiz-ilerleme kırığının arka kapısıydı.
- **B1 — Performans:** StatsPanel log render `.slice(0,80)` (endless'ta binlerce DOM satırı diff'leniyordu). **B2:** ölü `dailyLog` dizisi kaldırıldı (log() artık sadece logEntries; state'ten de silindi).
- **A5:** "nosafe" günlük hedefi 2+ dosya ister (tek ayak işiyle trivial değildi).
- **A7:** `bossAbove`/`buildDemand` artık `firedNames` filtreler (kovulan patron angarya/eve-gönderme yapamaz); `maybeImpressClient` başlık regex'i prefiks + " — ..." sonekini soyar (savaş başlıkları temiz okunur).

**v1.9.2 eklendi (2026-07-12, kullanıcı isteği):** Topbar'da "FRI IN n" yerine haftanın günü (`WEEKDAYS[(day-1)%WEEK_LEN]` — gün 1 Pazartesi, gün 5 Cuma altın renkli). Salt kozmetik; cuma review'ı hâlâ `day%5===0`, hafta sonu kartı `(day-1)%5===0`. Topbar.jsx.

**v1.9.3 eklendi (2026-07-12, dış denetim sonrası doğrulanan çökme/kilit bugları + Windows):**
- **NPC kovma çökmesi:** `dismissEmployee` artık kovulan NPC'nin aktif delege dosyalarını masaya geri veriyor (`c.delegated=null`) ÖNCE, sonra `S.npcs`'ten çıkarıyor; `resolveDelegated` ve `Inbox.jsx` null-guard'lı (`(...||{}).name||"a colleague"`).
- **Boş roster favor çökmesi:** `spawnFavor` başında `if(!S.npcs.length) return`.
- **Rakip savaş dosyası poach kilidi:** `rivalTick` hedef filtresine `&&!c.big` eklendi.
- **Buy-in çift terfi:** `checkPromotion` while'ında rank 3'e ulaşınca `break` (2→3→4 tek adımda zincirlenmiyor; Name Partner ayrı bir tetikleme gerektiriyor).
- **Windows donma:** `app.disableHardwareAcceleration()` (GPU sürücüsü boyanmayan pencere sorunu — kullanıcının Windows'taki arkadaşı "donup kalıyor" demişti); açılışta `fullscreen:true` yerine `win.maximize()` + `show:false`/`ready-to-show`; F11 fullscreen toggle, Esc çıkış. `electron/main.js`.

**v1.9.4 eklendi (2026-07-12, denge&bütünlük turu — 1. parça):**
- **Sıfır-saat reload exploit'i KAPANDI:** saat 0'ken reload artık overtime'ı atlamıyor — loadGame sonunda `if(!S.event&&S.hours<=0) checkClock()` prompt'u yeniden açıyor.
- **İçerik eventleri reload'da kaybolmuyor:** saveGame/loadGame `event`'i saklıyor AMA sadece içerik eventleri (`id!=="overtime"&&id!=="latework"`); geçici saat promptları yeniden türetiliyor. `pendingChoice` hâlâ transient.
- **Daily determinizmi:** `utils.js`'e `getRngState/setRngState` (mulberry cursor `_t` modül-scope); saveGame `rngState` yazıyor, loadGame daily'de `setRngState` (yoksa `setSeed(hash)`), diğer modlarda `clearSeed()`.
- **Delayed/delegated hedef+FIRM:** endDay cb'de `newObjective()` artık resolveDelayed/Delegated'DEN ÖNCE çağrılıyor (sabah gelen cevap günün hedefine sayılsın); resolveDelayed'e tier≥1 için FIRM ±1 simetrisi eklendi.
- **Fraud EXPOSED finali:** audit "do nothing" fail'ine `expose:true`; resolveCrisis'te `if(out.expose) gameOver("EXPOSED")`. Diğer audit fail'leri hâlâ sadece stat cezası.

**v1.9.5 eklendi (2026-08-07, denge turu — 2. parça):**
- **"İkinci seçeneğe bas" kalıbı kırıldı:** `instantiateCase` deep-copy edilen temel seçenekleri seed'li Fisher–Yates (`shuffle`, utils.js) ile karıştırır; corrupt judge bribe'ı SONRADAN eklenir ve daima son sıradadır. Save mevcut görünen sırayı korur. `clients.js`/`npcs.js` random `sort()` kullanımları da Fisher–Yates'e geçti.
- **Stil ekonomisi ayrıldı:** yalnız başarılı CASE ödüllerinde technical INF `×TECH_INF_MULT(.70)`, aggressive INF `×AGG_INF_MULT(1.25)`; mevcut `INF_EARN(.6)` ile tek geçişte ölçeklenir. Safe/neutral, fail, kriz ve delege ödülleri değişmez. Technical güven/REP yolu, aggressive hızlı terfi yoludur.
- **Mesai tavanı:** günde `OVERTIME_LIMIT(2)` blok; ilk +2h/+12 FATIGUE, ikinci +2h/+18 (`OVERTIME_FATIGUE_STEP(6)`). Limitten sonra prompt yalnız eve git seçeneği verir; engine guard sahte/stale üçüncü çağrıyı da reddeder.
- **Kahve tavanı:** `COFFEE_LIMIT(2)`; ilk −14, ikinci −8 FATIGUE, üçüncü satın alma strict no-op. Espresso dekoru yalnız fiyatı $40'a indirir, limiti kaldırmaz. UI aynı `canBuyCoffee()` guard'ını kullanır.
- **Eski save güvenliği:** eksik `otToday`, `otHours/OVERTIME_HOURS` üzerinden türetilir; kayıtlı değer 0..2 aralığına clamp edilir.
- **Kalıcı regresyon testi:** `npm test` (`scripts/v195-check.mjs`) shuffle/save/DAILY cursor, stil ödülleri, kahve+overtime guard/migration ve 5 senaryo × 4 mod başlangıcını kapsar.

**v1.9.6 eklendi (2026-08-07, bütünlük + güvenlik turu):**
- **Client War yaşam döngüsü:** `endClientWar(client)` bütün bitiş/kayıp/deadline yollarını merkezileştirir; inbox, follow-up, açık dosya ve latework seçimini idempotent temizler. `reconcileClientWarState()` eski kayıtlardaki sahipsiz/çift taşıyıcıları load sırasında onarır; spawn günü müşterisi veya aktif mandate'i olmayan filing düşürülür.
- **Versiyonlu save/migration:** payload `SAVE_SCHEMA_VERSION` + `savedAt` taşır; schema 0→1 migration'ı eksik modern alanları ve Client Book prospect havuzunu güvenli tamamlar. Yalnız `newState()` whitelist'i hydrate edilir; temel sayılar, koleksiyonlar, dava/option/outcome zincirleri, event, roster, rival ve Client War metadata doğrulanır. Gelecek sürüm, bozuk JSON ve geçersiz save ham hali korunarak Start ekranında ayrı gösterilir.
- **Kayıt hata güvenliği:** quota/blocked/serialize/write hataları son sağlam slotu bozmadan kalıcı `AUTO-SAVE FAILED` banner'ı verir; başarılı sonraki save uyarıyı temizler. Slot silme iki aşamalı; silme başarısızsa restart/reload ve terminal `NEW GAME` eski run'ı diriltmez, aynı buton silmeyi yeniden dener. Legacy tek-save anahtarı ancak hedef kopya doğrulandıktan sonra silinir. Ironman bozuk/yeni/blocked slotu değiştirmeden başlayabilir.
- **Büyüme sınırı:** diskte yalnız son `SAVE_LOG_LIMIT(200)` log ve `SAVE_ARCHIVE_LIMIT(200)` arşiv kaydı tutulur; `archiveTotal` tüm kariyer sayısını korur.
- **Gün sonu checkpoint'i:** deadline/review/debt/gece statları yürüyüş animasyonundan ÖNCE serileştirilen `pendingSummary` ile kaydedilir. Animasyon sırasında reload özeti geri getirir ve `advanceDay()` yalnız bir kez çalışır.
- **Toolchain/güvenlik:** Vite 7.3.6, plugin-react 5.2.0, Electron 43.3.0, esbuild 0.28.1, postcss 8.5.26; Node ≥22.12. `npm audit` 0 açık. Production CSP sıkı `script-src/connect-src 'self'`; yalnız Vite dev sunucusu Fast Refresh inline preamble'ı + loopback HMR WebSocket izni ekler. Electron popup, dış navigation ve tüm permission request'lerini reddeder; dev URL yalnız loopback host kabul eder.
- **Kalıcı testler:** `npm test` artık schema/migration, 5000 kayıt sınırı, bozuk/gelecek/boş save koruması, quota/storage/serialize/remove arızaları, animasyonda reload ve Client War cleanup/reconciliation invariantlarını kapsar.

**v1.9.7 eklendi (2026-08-07, FIRM anlamı + senaryo finalleri):**
- **Standard FIRM güveni:** `firmCondition()` FIRM'i CRITICAL/STRAINED/STABLE/THRIVING bantlarına ayırır. Yalnız Standard modda dava sonrası müşteri etkilenmesi, sabah prospect edinimi ve kayıp sonrası müşteri ayrılma oranlarını değiştirir; diğer modların mevcut eğrisi korunur.
- **Terfi kapıları:** Standard rütbe geçişleri sırasıyla FIRM 40/45/50 ister; buy-in parası şart sağlanmadan kesilmez. Mevcut yüksek rütbeli kayıtlar geriye düşürülmez. FIRM<50 iken TURNAROUND PLAN 1.5 saat +6 FATIGUE karşılığında +10 FIRM verir, 5 gün cooldown taşır; erken otomatik batış eklenmedi.
- **Delege simetrisi:** tier≥1 delege sonuçları kazanırsa +1, normal kaybederse −1 FIRM; Lazy sessiz bırakma henüz hüküm olmadığı için nötrdür.
- **Özel finaller:** Defector ve Boomerang terminal kazanma/kaybetme ekranlarına senaryoya özgü kapanış satırları eklendi. Boomerang zaferi `RETURN TO SENDER` başarımını açar; toplam 11 başarım.
- **Save schema v2 + testler:** `firmPlanDay` ve `firmGateHintRank` 1→2 migration'ıyla backfill edilir ve doğrulanır. `npm test` bant sınırlarını, oranları, mod izolasyonunu, terfi/buy-in guard'larını, turnaround maliyet-cooldown'unu, delege FIRM sonuçlarını ve beş senaryonun finallerini kapsar.

**v1.9.8 eklendi (2026-08-08, hakim hafızası):**
- **Stabil hakim kimliği + run hafızası:** 7 `JUDGES` kaydı sırası bozulmadan `id` ve deterministik iyi/kötü replik aldı. `S.judgeMemory`, katalog nesnelerini MUTATE ETMEDEN, ID başına görünme/stil/sonuç/son gün sayaçlarını tutar; yeni run'da sıfırlanır.
- **Canlı ve tavanlı modifier:** aynı hakimde agresif geçmiş kazanım başına −5 / kayıp başına −6 (toplam min −8); teknik W +4 / L −3 (−6..+6); tekrar bribe −7 (min −8). Safe garanti %100 kalır ve eski kalıbı silmez. Başka hakim etkilenmez. `judgeMemoryModifier/Info` saf ve RNG tüketmez.
- **Bilgi + replik UX'i:** CasePane ilk görünme veya önceki görünme/son stil/sonuç, son stile ve sonuca uyan hakime özel replik, W/L özeti ve tam canlı stil etkisini gösterir. Case Archive, gelecekteki duruşmalardan etkilenmemesi için duruşma anındaki `judgeMemory` metnini snapshot saklar; delayed dosya bu güvenli metni seçim anında `pending.judgeMemorySnapshot` içine dondurur. Info paneli ve GDD §7 güncellendi.
- **Sonuç bütünlüğü:** instant sonuç archive'dan sonra tam bir kez hafızaya yazılır; delayed sonuç seçimde DEĞİL REPLY reveal'da yazılır (gizli `pending.win` oranlardan sızmaz). `choose()` stale/double-click guard'ı aynı davanın iki kez ödül/hafıza üretmesini engeller. Deadline kaçırma görünme sayılmaz.
- **Save schema v3 + sert doğrulama:** 2→3 migration eksik `judgeMemory:{}` backfill eder; eski ID'siz açık hakim snapshot'ları kalıcı `LEGACY_JUDGE_IDS` isim→ID alias'ıyla çalışır. v3'te yalnız bilinen stabil ID güven kaynağıdır (çakışan isim ID'yi ezemez); isim/stat snapshot'ı güncel `JUDGES` kaydından yeniden kurulur. Memory sayaç/enums/son-stil-tutarlılığı/gün sınırı, option style enumu, canlı `judge:true`, pending/archive memory tipi ve delegated-court sahteciliği doğrulanır.
- **DAILY/test:** replik, modifier, bilgi render ve memory update RNG cursor tüketmez. `npm test`; kimlik/quote, exact cap, same/other judge, safe, instant/delayed tek-yazım, delayed hearing snapshot'ı, non-empty memory save/reload, immutable archive, legacy ID fallback, malformed save ve aynı DAILY trace'i kapsar.

**v1.9.9 eklendi (2026-08-08, deterministik kariyer soak + uzun-run bütünlüğü):**
- **Headless kariyer laboratuvarı:** `scripts/soak-balance.mjs` gerçek public engine aksiyonlarını sürer; oyun RNG'si ile politika RNG'si ayrıdır. Beş temel politika + Endless `firm_stress`, provenance/source guard, canonical trace hash ve tek-seed replay modu vardır. `npm run test:soak` küçük, `npm run soak` varsayılan 64-seed matrisi çalıştırır.
- **Doğrulanmış baseline:** 5 senaryo × Standard(40 gün) + Endless(50 gün), toplam 3.520 kariyer; 252/252 uç/şüpheli replay birebir aynı, 0 invariant ihlali. Technical Standard 315/320 win ve medyan gün 10 ile fazla baskın; pure Aggressive 10/320, exact max-chance 2/320. Normal Endless Technical 11.039 Name Partner sonrası günde 0 FIRM collapse. Detay ve A/B planı `BALANCE_SOAK_REPORT.md` içinde. Bu turda gameplay balance sabitleri DEĞİŞMEDİ.
- **Save schema v4 / filing kimliği:** `S.caseSeq` prosedürel ID cursor'unu save/reload boyunca taşır; generated dava, nested appeal, Big Matter aşamaları ve lawsuit aynı persistent kaynaktan ID alır. 3→4 migration canlı/nested/archive ID'lerinden güvenli alt sınır türetir; unsafe veya mevcut ID'nin gerisindeki cursor, ID'siz canlı/generated yapı ve eksik `dueDay` reddedilir. Archive artık filing `id` saklar.
- **Kritik bütünlük fixleri:** latework sonrası saat 0'da clamp (negatif saat save'i yok); sabah tüm delayed/delegated sonuçlarından sonra tek promotion check (Endless NP özet race'i yok); active event option kimliği strict guard (stale/double click yok); expired Lazy/missing-NPC işi yeniden canlanmak yerine deadline miss olur; stale NPC delegation no-op; 2h overtime hazard tam blok bileşiğini kullanır.
- **Endless terminal/record sırası:** rank 3→4 sırasında FIRM collapse kazanım kaydından önce kontrol edilir. Endless'ın ilk NP kaydı run/win'i bir kez sayar; kariyer daha sonra uzadığında lifetime best day/rank güncellenmeye devam eder.
- **Bounded inbox:** notification mesajları en yeni `INBOX_MESSAGE_LIMIT(80)` kayıtla sınırlı; canlı davalar ayrı korunur, eski save load sırasında onarılır. 3.520 koşuda maksimum tam 80, taşma 0.
- **Regresyonlar:** gerçek latework zinciri, dual morning result, low-FIRM false win, lazy/missing deadline burn, procedural ID DAILY reload/migration, malformed schema4, stale event/overtime, message repair, Client War carrier ve Endless record idempotence kalıcı `npm test` kapsamındadır.

**v1.9.10 eklendi (2026-08-08, ölçümlü progression A/B):**
- **Exact INF attribution + yeni politikalar:** test-only probe pozitif INF'i `case/big_case/delayed/delegated/favor/objective/review/crisis/client_event/demand/story/weekend/rival/decor/other` kaynaklarına ayırır. Soak runner `mixed` görünür-bilgi kariyer botu, izole `firm_only_stress`, scenario/mode/policy/variant filtreleri ve variant-bazlı cohort raporu aldı. Production, experiment/probe set etmez.
- **A/B kararı:** delegated INF ×.5 ve dağıtılmış reward kesintileri Technical rotayı hâlâ %100 / medyan gün 11'de bıraktı. Friday-only promotion süreyi 21 güne taşıdı ama 2 delege/gün ile %96,9 win kaldı. Friday promotion + `DELEGATE_CAP(1)` final 64-seed Standard kohortunda %69,4 win / medyan gün 21 / gün≤12 %0 verdi; beş senaryo Technical sonucu %65,6–73,4. Bu aday canlıya alındı; reward/zar/NPC oranları değişmedi.
- **Terfi ritmi:** Influence eşiği artık yalnız promotion-ready yapar. Cuma end-of-day partner review kararının ertesi sabahı en fazla bir rütbe verilir. UI barı/info/log bunu açıklar; review tüketimi `S.promotionReviewDay`, tek-seferlik mesaj `S.promotionHintRank` ile save-stable'dır.
- **Delegasyon UX/guard:** günde tek filing devredilir. CasePane `used/1` gösterir ve slot dolunca butonları disable eder; engine sahte/stale ikinci çağrıyı strict no-op tutar.
- **Save schema v5 + doğrulama:** 4→5 migration iki promotion alanını backfill eder; gün/rank sınırları validate edilir. Reload tüketilmiş cuma kararını yeniden oynatamaz. Regresyon testi cadence, tek-review/tek-rank, save/reload ve handoff limitini kapsar.
- **Final doğrulama:** paired Standard 1.280 kariyer / 96 replay ve Endless 1.920 kariyer / 201 replay; tüm replay'ler aynı, invariant ihlali 0. Ayrıntı `BALANCE_SOAK_REPORT.md` v19.10 ekinde.

**v1.9.11 eklendi (2026-08-08, controlled-risk + Boomerang kök neden):**
- **`bold_mixed` politika:** yalnız görünür şans bilgisini kullanır; REP/Boldness tamponuyla ölçülü aggressive shot alır, tehlikede safe/technical'a döner, deadline baskısında delege eder ve rival truce kullanır. Final 320 Standard kariyerde %9 aggressive seçim, %63,4 win, %14,4 FIRED; Technical %69,4 win/%5,6 FIRED. Risk rota yaşayabilir ama gerçekten daha tehlikelidir.
- **Nedensel telemetry:** test-only balance probe artık oyuncu pozitif INF'inden ayrı rival `passive/failure` INF kaynağını bildirir. Soak delegated W/L, deadline sonucu, rival hamlesi, final NPC rel, aggressive visible-chance bandı ve her rütbenin `promotionReadyDay` medyanını toplar. Canonical replay snapshot v1.9.10 promotion review/hint state'ini de kapsar.
- **Boomerang false positive fix'i (SADECE test modeli):** eski Mixed bot başlangıç rel−25 → görünür ~%55 delegasyon tahminini kendi %60 eşiğiyle reddedip 64 seedde 0 delege yapıyordu. Deadline baskısında Boomerang için %55'i kabul edince aynı corpus %21,9→%71,9 win, 4,30→1,20 miss, 0→14,23 delege/run oldu. Oyun senaryosu/NPC/REP/deadline sabiti DEĞİŞMEDİ.
- **Şüpheli seed ikinci test:** `2874639110` eski modelde 0 delege+9 miss ile OUTPACED; yeni modelde 16 delege+0 miss ile gün21 Name Partner. Yeni trace iki tekrar `7d8a6193...74ac`, birebir aynı.
- **Reddedilen reward A/B:** `AGG_INF_MULT` 1.25/1.50/1.75, 480 paired kariyerde aynı %59,4 win/gün21 verdi. Hook'un draw-time fx'i gerçekten değiştirdiği regression ile kanıtlandı; ek INF cuma beklerken 100 cap'inde kırpıldığı için gameplay constant'a alınmadı.
- **Ana doğrulama:** 64 seed × 5 senaryo × Technical/Mixed/Bold Mixed = 960 kariyer, 79/79 replay, 0 invariant. Ayrıntı `BALANCE_SOAK_REPORT.md` v19.11 bölümünde.

**v1.9.12 eklendi (2026-08-08, FIRM endgame A/B):**
- **Canlı Name Partner operasyonu:** roster her sabah `ceil(headcount/10)` FIRM payroll yakar (başlangıç ~13 kişi → −2). Her personel %30 ihtimalle iş yapar; PERFORMANCE ile şans `50+impact×8`, win `+1`, loss `−2` FIRM. Collapse eşiği 15 değişmedi.
- **Gerçek yönetim tradeoff'u:** zayıf personeli çıkarmak roster drift'ini ve 11→10 headcount eşiğinde payroll'u iyileştirebilir; kovma morali −2, NPC delegation kaybı ve kalıcı lawsuit heat'i aynen korunur.
- **UI tutarlılığı:** yanlış `IMPACT n/day` metni `PERFORMANCE n · p% WIN` oldu. FIRM overlay headcount, sabah operating load, %30 activity ve exact `+1/−2` sonucu gösterir; NP özeti ilk payroll'u açıklar.
- **Nedensel telemetry:** post-NP FIRM akışı kaynaklara ayrılır; roster work, raw/capped drift, employee-days, firing impact, lawsuit, cap'te kırpılan FIRM ve delta/gün raporlanır. `firm_manager` ile aynı docket'i kötü yöneten `firm_bad_manager` eşli kontrol eklendi.
- **Final A/B:** 64 seed × 5 senaryo × 2 politika × old/new = 1.280 Endless kariyer. Eski model 7.400 iyi + 6.390 kötü yönetim post-NP gününde 0 collapse; yeni model iyi %3,4, kötü %12,5. FIRM-cap günü %53,7/%37,2→%4/%2. 132/132 replay, 0 invariant. Save schema değişmedi.

**v1.9.13 eklendi (2026-08-09, hakim hafızası rolling A/B):**
- **Rolling active recall:** lifetime hakim W/L sayaçları ve özel replikler korunur; canlı şans yalnız son 3 duruşmayı `×1/×.35/×.15` ağırlıkla kullanır. Safe veya farklı stil yeni pencereye girerek eski örüntüyü yumuşatır; safe hâlâ %100. Technical üç yakın win ile +6 cap kurabilir, davranış silinmez.
- **Friday adayı reddedildi:** eski full-career, Friday half-life ve rolling aynı seed'lerde çalıştı. Friday daha düşük cap verdi ama oyuncu aksiyonundan bağımsız takvim uçurumu yarattı. Rolling final 640 Endless kariyer/14.185 duruşmada post-day20 tüm cap `%53,3→%24,9`, Technical +6 `%54,4→%26,8`, Aggressive −8 `%53,1→%13,8`; Technical NP `%75,6` ve medyan gün21 değişmedi.
- **UI:** CasePane lifetime `CAREER` toplamıyla `ACTIVE RECALL` kuralını ayırır; bugünkü exact modifier görünür. Info paneli son üç duruşma davranışını açıklar. Archive snapshot ve delayed-result gizliliği korunur.
- **Save schema v6:** ID başına en fazla 12 recent event persist edilir. 5→6 migration v3–v5 lifetime toplamlarını kaybetmez, yalnız son bilinen duruşmayı active recall seed'i yapar. Recent enum/sıra/gün/counter/tail/limit doğrulanır; bozuk v6 kayıt sessizce onarılmaz.
- **Deterministik test:** ön A/B 960 kariyer + 261 replay; final paired 640 kariyer + 88 replay; hepsi birebir, integrity 0. `npm test` rolling exact matematik, bounded transcript, Friday kontrolü, v5 migration, malformed recent ve DAILY save/reload cursor'u kapsar.

**v1.9.14 eklendi (2026-08-09, INF overflow / Exceptional Review):** Senior Partner'da 100 üstünde kırpılan pozitif INF, 36 puanlık görünür review momentum'una dönüşür. En az iki sabah, REP 30+, FIRM kapısı ve ordinary Friday önceliği korunur; save schema v7.

**v1.9.15 eklendi (2026-08-09, Earned Final Warning):** Fatal agresif fail yalnız BOLD≥70, 3+ başarılı blöf ve `bluffW>bluffL` snapshot'ıyla run başına bir kez durdurulur; REP 28'e gelir, −15 BOLD ödenir. Instant/delayed/crisis tek semantik kullanır; save schema v8.

**v1.9.16 eklendi (2026-08-11, interaktif aksiyon vertical slice):** Redvale dosyasına tek kullanımlık COVERT ACTION eklendi. Üç denemeli kilit açma başarıda aynı dosyanın risky legal seçeneklerine +12 kanıt avantajı verir; üç miss sonrası deterministik yazı-tura çağrısı kaçış/yakalanma sonucunu belirler. Aksiyon davayı otomatik kazandırmaz. Tüm dallar 1.5h +7 FATIGUE öder; caught dosyayı kayıp olarak arşivler. `minigames.js` shared RNG tüketmez; challenge save/load'da aynı faz/deneme/sonuçla sürer. Save schema v9 target/coin/phase/position/case marker/briefing ilişkisini yeniden türetip doğrular. Modal focus trap + inert background, 48–52px touch hedefi, safe-area ve reduced-motion desteği içerir.

**v1.9.17 eklendi (2026-08-12, Power Cut):** Aldergate/NimbusHost dosyasına ikinci COVERT ACTION eklendi. Farklı hız/yön/hedefli üç dönen devre halkası amber pencere içinde sırayla durdurulur; tek miss güvenliği uyandırıp deterministik coin-call kaçışına geçer. Üç başarı patch ledger'ı çıkarıp aynı dosyanın risky legal seçeneklerine +12 verir; dava otomatik kazanılmaz. Tüm dallar 1.5h +8 FATIGUE öder. Board shared RNG tüketmez; background frame delta 80ms ile sınırlıdır. Save schema v10 aktif halka, her halkanın elapsed/angle/phase'i ve sabit board kimliğini cross-validate eder. Desktop ve kompakt modal UI tamamlandı.

**v1.9.18 eklendi (2026-08-12, progression + skill):** Sekiz seviyeli bağımsız kariyer XP'si ve her level-up'ta bir skill point tamamlandı. Senaryo innate rankları: Fraud SNEAKY 2, Debtor ENDURANCE 2, Defector/Boomerang 1+1, Legacy 0+0. SNEAKY rank başına lock tolerance +1°, rank 2/5'te ek deneme, Power Cut'ta −%7 hız ve daha geniş pencere verir. ENDURANCE senaryo katsayısından sonra pozitif work-fatigue'ı rank başına %6 düşürür; rest/coffee/overtime/geceye sarkma/narrative cezalara dokunmaz. XP yalnız görünür terminal/reveal noktalarında tek kez yazılır: instant/delayed case, final delegated handback, COVERT completion ve gerçek crisis. Delayed seçim, action start/attempt, silent return, deadline, favor, chore ve alışveriş 0 XP'dir. StatsPanel accessible LEVEL/XP/point/rank/exact-effect UI içerir. Schema v12 progression invariantlarını ve versioned challenge skill snapshot'ını strict doğrular; aktif v9/v10 puzzle'ları legacy rules ile board/toil/checkpoint değiştirmeden sürer, ara v11 late-work checkpoint'i de kayıpsız yükselir. Geç kariyerde SNEAKY yatırımının ölü seçime dönüşmemesi için 12. prosedürel filing iki COVERT board tipinden birini tekrar sunabilir.

**v1.9.19 eklendi (2026-08-12, Fraud fatigue slip + identity pressure):** Fraud senaryosu her pozitif işten sonra post-ENDURANCE günlük en yüksek FATIGUE'ı kaydeder; gün sonundaki tek check 80–89 `%0.5`, 90–94 `%1.5`, 95–99 `%3`, 100 `%5` kullanır. Kahve peak'i silmez; terminal gün ghost event yazmaz; reload reroll vermez. Hit doğrudan ölüm/stat cezası değil, ertesi oynanabilir sabaha cover-story event'i kuyruğa alır. Başarısız cover kararları `SUSPICION 0..3` üzerinden alumni/faculty → iki bar numarası → malpractice insurer diploma proof zincirini açar; yalnız final aşamada bilinçli risky fail `EXPOSED` yapar, her aşamada 100% nonlethal BOLD/INF maliyetli yol vardır. StatsPanel THE SECRET görünümü, Info copy'si, `fraud.js` saf model/builders ve soak fraud telemetry eklendi. Schema v14 `fraudRisk` exact state + pending kind/day + canonical aktif event + pre-morning continuation'ı strict doğrular; schema12/13 kayıtları migrate olur, açık legacy audit canonical grandfather edilir. Due confrontation sabah REP/INF decay, rival, reply ve roster'dan önce açılır; seçimden sonra sabah pipeline'ı reload-safe biçimde tam bir kez sürer.

**Dış denetim notu (Codex, 2026-08-12):** Bayat/untracked `AGENTS.md` yüzünden gerçek checkpoint yanlışlıkla v1.9.1/hakim hafızası sanılmıştı. Hakim hafızası v1.9.8/v1.9.13'te bitmişti; gerçek yarım iş v1.9.16 sonrası Power Cut entegrasyonuydu. Yarım model/UI dosyaları korunup engine/content/save/CSS/test zinciri tamamlandı.

**En son çalışılan konu (2026-08-13):** v1.9.19 Fraud fatigue slip + üç aşamalı identity pressure tamamlandı ve `46adae600` ile `origin/minigames`'e pushlandı. Band sınırları, daily peak/coffee semantiği, terminal gün sırası, safe-route nonlethal garantisi, staged EXPOSED nedeni, pre-morning exact-once resume, schema12→14 migration ve event/state tamper regresyonları yeşil. `npm test`, production build ve deterministic soak geçti. Güncel ortak handoff ve oturum günlüğü `DEV_LOGBOOK.md`'dir. Sıradaki kullanıcı-onaylı içerik **Evidence Timeline** vertical slice; henüz kodlanmadı. Mobil layout + Capacitor, bağlamsal SFX ve Steam paketleme sonraki backlog'dur.

**Aklında tut (kullanıcı onaylı bekleyenler):** mobil layout + Capacitor; bağlamsal SFX; Steam paketleme (electron-builder + steamworks.js).

---

# 3. Tech Stack

- **Framework:** React 18 + Vite 7 (ilk React/Vite kararı: 2026-07-05; Vite 7 güvenlik güncellemesi: 2026-08-07). JSX, ES modülli config (`vite.config.mjs`). Node ≥22.12.
- **State:** Framework state kütüphanesi YOK. Tek global mutable obje `S` (`src/game/state.js`) + minimal store: engine `S`'i mutasyona uğratır, `notify()` çağırır; React `useSyncExternalStore` ile dinler (`useGame()` hook'u). Oyun mantığı React'ten tamamen bağımsız saf JS modülleri.
- **Dış bağımlılık (runtime):** react, react-dom + Google Fonts'tan `Press Start 2P` (CSS `@import`; internet yoksa monospace fallback). Başka runtime bağımlılığı EKLENMEZ.
- **Ses:** Web Audio API ile runtime sentez — hiçbir ses dosyası yok (`src/game/sound.js`).
- **Grafik:** CSS (chunky border, scanline overlay) + ofis sahnesi için runtime üretilen inline SVG (`OfficeScene.jsx`). Hiçbir görsel asset dosyası yok.
- **Build/deploy:** `npm run dev` (Vite dev server, tarayıcı), `npm run build` (statik `dist/` — GitHub Pages/itch.io'ya konabilir), `npm start` (build + Electron masaüstü penceresi, Steam hedefi). `vite.config.mjs`'te `base:'./'` — Electron `file://` ve Pages alt yolları için gerekli, bozma.
- **Steam yolu:** Electron wrapper `electron/main.js`. İleride: `electron-builder` ile exe/app paketleme + `steamworks.js` ile Steamworks entegrasyonu (henüz eklenmedi).

---

# 4. Full File Structure

```
fancy-outfits/
├── index.html                    ← Vite giriş HTML'i (sadece #root + main.jsx import)
├── vite.config.mjs               ← Vite ayarı (react plugin, dev-only CSP dönüşümü, base:'./')
├── package.json                  ← scripts: dev/build/test/test:soak/soak/preview/start
├── electron/main.js              ← Electron ana süreci: pencere açar, dist/index.html yükler
├── scripts/
│   ├── run-v195-check.cjs        ← browser-oriented modülleri Node regresyonu için bundle eder
│   ├── v195-check.mjs            ← kalıcı engine/save/denge/bütünlük regresyonları
│   ├── run-soak-balance.cjs      ← headless kariyer simülatörünü geçici bundle'da çalıştırır
│   └── soak-balance.mjs          ← Standard/Endless matris, politika, metric, replay+provenance
├── src/
│   ├── main.jsx                  ← React mount
│   ├── App.jsx                   ← layout + overlay'lerin koşullu render'ı
│   ├── styles.css                ← TÜM CSS (palet :root'ta, scanline, panel, paper, overlay)
│   ├── game/                     ← OYUN MANTIĞI (React'ten bağımsız saf JS)
│   │   ├── constants.js          ← RANKS, RANK_REQ, DAY_HOURS, STAKE_*, PRICES, save schema/limitleri
│   │   ├── settings.js           ← global tercihler (dayLen/sfx/bgm/shake), run save'inden AYRI
│   │   ├── state.js              ← S, newState(), store (subscribe/notify), nemesis/runStats
│   │   ├── engine.js             ← apply(), chance(), akış + nemesis/terfi sahnesi/ledger/ayarlar
│   │   ├── content.js            ← buildPool() 11 el yazması dava + 2 COVERT action, JUDGES(7), crises(), SCENARIOS
│   │   ├── casegen.js            ← PROSEDÜREL dava üreticisi (12 şablon, API'siz, offline)
│   │   ├── clients.js            ← client book: 20 parodi marka, CLIENT_CAP, global event üretici
│   │   ├── achievements.js       ← 11 başarım, localStorage (fo_ach_v1), unlock()
│   │   ├── npcs.js               ← NPC roster, trait dağıtımı, delegationChance(), buildFavor()
│   │   ├── sound.js              ← WebAudio sentez SFX + prosedürel ambiyans (settings'ten ses)
│   │   ├── minigames.js          ← deterministik/saf lockpick + Power Cut + coin challenge modelleri
│   │   ├── progression.js        ← saf XP/level/skill invariantları + SNEAKY/ENDURANCE modifierleri
│   │   ├── fraud.js              ← Fraud suspicion/peak state, slip bandları, canonical identity eventleri
│   │   ├── utils.js              ← clamp, rnd, hash, rand/setSeed (deterministik RNG — daily mod)
│   │   └── useGame.js            ← React köprüsü (useSyncExternalStore hook'u)
│   └── components/               ← UI (her panel/overlay ayrı dosya)
│       ├── StartScreen.jsx       ← senaryo + zorluk seçimi, CONTINUE, FIRM RECORD
│       ├── Topbar.jsx            ← logo, rütbe, gün+FRI, mesai saati+bar, SFX/BGM/i/SET/GO HOME
│       ├── OfficeScene.jsx       ← piksel ofis SVG'si + karakter (otur/yürü/terfi sahnesi sceneRank)
│       ├── Inbox.jsx             ← sol panel (dava/pending/delegated/msg/favor/chain)
│       ├── CasePane.jsx          ← orta panel (dava + seçenekler + DELEGATE + dedektif + bribe)
│       ├── StatsPanel.jsx        ← sağ panel (statlar, para, RIVAL, EXPENSES, THE FLOOR, log)
│       ├── InfoOverlay.jsx       ← "i" paneli
│       ├── SettingsOverlay.jsx   ← ayarlar (gün süresi, ses, sarsıntı)
│       ├── RosterOverlay.jsx     ← FIRM sekmesi: payroll, W/L, impact, FIRE/CALL A VOTE (NP endgame)
│       ├── ArchiveOverlay.jsx    ← LOG sekmesi: dava arşivi (gün, seçim, sonuç, via etiketi)
│       ├── EventOverlay.jsx      ← kriz ekranı (+ Traitor/Brave modifier satırı)
│       ├── ActionMinigameOverlay.jsx ← blocking COVERT ACTION modalı + focus/inert yönetimi
│       ├── minigames/            ← Lockpick, PowerCut ve CoinFlip sunum bileşenleri
│       └── SummaryOverlay.jsx    ← gün sonu / cuma review / game over / win + run ledger
├── FANCY_OUTFITS_GDD.md          ← Tasarım dokümanı (gelecek özelliklerin speci)
├── BALANCE_SOAK_REPORT.md        ← v19.9 baseline + v19.10–v19.13 progression/risk/FIRM/memory A/B raporu
├── README.md                     ← GitHub vitrini + CHANGELOG (her versiyonda güncellenir — §6 kuralı)
├── CLAUDE.md                     ← Bu dosya
├── .gitignore                    ← node_modules/, dist/
├── dist/                         ← build çıktısı (git'e girmez)
└── node_modules/                 ← (git'e girmez)
```

**Altın kural:** `src/game/` React'ten habersizdir (hiçbir dosyası react import etmez, `useGame.js` hariç); `src/components/` oyun kuralı içermez, sadece state okur ve engine fonksiyonu çağırır. Yeni özellik eklerken bu ayrımı koru.

---

# 5. Architecture Explanation

**State:** Tek mutable obje `S` (`src/game/state.js`, modül-scope, oyun başlayana dek `null`). `newState(scenario)` üretir. Başlıca alanlar:
`scenario, mode, day, hours, fatigue, rank, rep, bold, inf, firm, money, debtDue, inbox[], pool[], followups[], clients[], npcs[], judgeMemory{}, caseSeq, archive[], logEntries[], over` + UI alanları `openCase, event, summary, pendingSummary, flash`.
Save'e girmemesi gereken animasyon/overlay pointer'ları whitelist hydrate yaklaşımıyla soyulur; `caseSeq` ve DAILY `rngState` ise devamlılık için persist edilir.

**Data flow (tek yön):**
```
Kullanıcı tıklar → component, engine fonksiyonunu çağırır (choose/resolveCrisis/...)
  → chance(o,c) ile % hesaplanır → utils.rand() zarı
  → apply(fx) → S mutasyonu + log() + checkEndings()
  → checkPromotion() → notify() → useGame() abonesi tüm componentleri yeniden render eder
```

**Kurallar:**
- Stat değişimi SADECE `apply(fx)` üzerinden yapılır. `apply` senaryo modifierlerini (Legacy ×1.25) uygular, clamp'ler, loglar, ending kontrolü yapar. Elle `S.rep += x` YAZMA.
- Her S mutasyonundan sonra `notify()` çağrılır (eski `renderX()` çağrılarının karşılığı). Engine dışında S mutasyona uğratılmaz; componentler sadece okur.
- XSS/escape: JSX zaten kaçış yapıyor, eski `esc()` kaldırıldı. `dangerouslySetInnerHTML` KULLANMA.

**UI gating (türetilmiş):** `isPaused()` overlay/summary açıkken alttaki masa aksiyonlarını kapatır. Gerçek-zamanlı sayaç ve PAUSE butonu v1.5'te kaldırıldı; okuma bedava, yalnız iş yapmak `S.hours` tüketir.

**Zaman/event sistemi:** gün 09:00→17:00 varsayılan 8 saatlik aksiyon bütçesidir. `optHours()` safe/technical/aggressive yaklaşım maliyetini hesaplar; `spendHours()` saati 0'da clamp eder ve fatigue ekler. Saat biterse `checkClock()` eve git/overtime event'i açar. `endDay()` deadline, objective, Friday review, debt, gece decay ve özeti checkpoint eder; `advanceDay()` ertesi sabah delayed/delegated sonuçlarını topluca çözer, tek promotion check yapar, follow-up ve yeni dosyaları doğurur, sonra roster/rival/event tick'lerini işletir.

**Inbox item tipleri** aynı dizide flag'lerle ayrılır:
1. normal dava (tıklanır, `openCase` olur),
2. `pending`'li dava (cevap bekliyor, tıklanamaz),
3. `delegated` dosya (sabah sonucu bekler),
4. `favor`, `chain` veya `big` özel filing,
5. `msg:true` salt bilgi kartı (en yeni 80 bildirim; canlı filing'ler bu sınırdan etkilenmez).

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
    p-=4;                                           // v1.5.1: global risk vergisi
    if(S.rep<30) p-=12; else if(S.rep>70) p+=5;     // saygı sistemi
    p-=S.rank*2;                                    // rütbe baskısı
    p-=Math.round(S.fatigue*.15);                   // yorgunluk (tavan −15)
  }
  return Math.round(clamp(p,5,95));
}
```
(Gerçek fonksiyonda ayrıca: kriz modifieri, dedektif dosyası +12, Defector'ın Fitch bonusu +8 — engine.js'e bak.)

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
- **UI:** 3 sütun — INBOX (sol), CASE FILE/DESK (orta, kağıt görünümü), ASSOCIATE FILE (sağ: stat barları + log). Üstte topbar + ofis sahnesi bandı. Topbar duvar saatini, kalan kurgusal iş saatini ve gün bütçesi barını gösterir; gerçek zamanlı sayaç yoktur. Buton renk kodu: yeşil=safe, mavi=nötr/technical, kırmızı=aggressive/blöf. Her butonun altında küçük altın satırla bulanık oran, saat maliyeti ve stil etiketi görünür.
- **Animasyon:** `.flash` (HENDERED!/PROMOTED! pop), stat barı `width .3s`, karakter yürüyüşü (`char-leave/arrive` CSS keyframe), ekran sarsıntısı (`.shaking`, App'te fail'de replay, `settings.shake` gate). Başka animasyon sistemi yok, gerekmedikçe ekleme.
- **Ses:** `SFX.{click,open,win,lose,promo,fired,bell,tick,send,crisis}` + prosedürel lo-fi ambiyans (v0.9: 4 akorluk Web Audio döngüsü + noise cızırtısı, `startAmbience/stopAmbience`). Topbar'da SFX ve BGM ayrı toggle'lar; BGM tercihi `localStorage`'da. Ses dosyası hâlâ SIFIR.

---

# 9. Game Mechanics

- **Player:** 5 stat. REP (başlangıç 50; <20 kovulma; her gece −1; <30 disrespect, >70 respect), BOLD (40; blöf şansını besler, safe seçenekler kemirir), INF (10; terfi para birimi), FIRM (62; firma sağlığı — NP iken <15 batış), MONEY ($1500, Debtor'da $3000).
- **"Enemy" karşılığı:** Karşı taraf ayrı bir AI değil — zorluk `chance()` formülü + hakim statları + kriz eventleri üzerinden. Rakip firma Snidely Fitch flavor + bazı davaların konusu.
- **Level karşılığı:** Rütbeler. `checkPromotion()`: `inf >= RANK_REQ[rank]` oldukça yüksel (while ile zincirleme terfi mümkün). Rütbe 4 = win. Tier-2 (mahkeme) davaları rank≥1'de havuza girer (`drawCases` filtresi).
- **Combat karşılığı:** Dava çözümü — oku, seç, zar. Zar: deterministik oyun RNG'siyle `rand()*100 < chance(o,c)`; `Math.random` yalnız ses jitter'ında kullanılabilir.
- **Progression:** Influence→rütbe→daha iyi ofis (görsel) + daha zor davalar (rank başı −2 şans) + daha büyük kriz maruziyeti.
- **Physics:** YOK (bilinçli).
- **Controls:** Fare/tık + klavye (v1.1): 1-4 seçenek, Space defer/özet ilerlet, Esc panel kapat.
- **RNG kuralı (v1.1):** Oyun mantığında `Math.random` YASAK — `utils.js`'ten `rand()`/`rnd()` kullan (daily modun determinizmi buna bağlı). Tek istisna `sound.js`.
- **Rakip (nemesis):** İsimli associate seninle yarışır; gece + senin fail'lerinden INF kazanır, önce Name Partner olursa `OUTPACED` game over (`nemesisGain`, engine.js).
- **Ayarlar (`settings.js`):** run save'inden AYRI global tercihler (`fo_settings_v1`): dayLen 6/8/10 saat, sfx/bgm ses seviyesi, ekran sarsıntısı. Sound bunları okur.
- **Ekonomi/zorluk sabitleri:** `DAY_HOURS=8` (+`TIER_HOURS=[1,2,3]`, `DELEGATE_HOURS=.5`, `OVERTIME_HOURS=2`, `OVERTIME_LIMIT=2`, `OVERTIME_FATIGUE=12`, `OVERTIME_FATIGUE_STEP=6`, `FATIGUE_REST=18`), `COFFEE_LIMIT=2` (`COFFEE_RELIEF=14`, `COFFEE_FALLOFF=6`), `REP_FIRED=20`, `DEADLINE_PENALTY=-9`, `RANK_REQ=[35,60,85,95]`, `INF_EARN=0.6`, `TECH_INF_MULT=.70`, `AGG_INF_MULT=1.25`, `INF_DECAY=[1,1,2,2,2]`, kriz olasılığı `.6`, gece REP çürümesi `-1`, Debtor taksiti `$2000/3 gün`, `STAKE_REWARD=[1,1.15,1.3,1.45,1.6]`, `STAKE_PENALTY=[1,1.3,1.6,1.9,2.2]`, `PRICES={suit:1200(×1.5 artar), detective:900, marv:600}`, `WEEK_LEN=5`, `REVIEW_GOOD=10`, `REVIEW_BAD=0`.
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
- ~~Global eventler + Client list~~ — v1.3'te EKLENDİ (parodi isim kuralı korunuyor: yeni marka eklerken Abibas/Mike tarzında kal).
- ~~Dava arşivi~~ — v1.4'te EKLENDİ (LOG butonu + günlük hedeflerle birlikte).
- ~~**NPC hikâyeleri** — rel eşiklerinde tetiklenen mini-sahneler.~~ — v1.6'da EKLENDİ.
- ~~**Rakiple etkileşim** — nemesis'e sabotaj/ittifak seçenekleri.~~ — v1.7'de EKLENDİ.
- ~~**Hakim hafızası** — aynı hakime ikinci çıkışta geçmişi hatırlama ("geçen sefer blöf yaptın, −5").~~ — v1.9.8'de EKLENDİ.
- ~~**Interaktif aksiyonlar:** Redvale lockpick + coin (v1.9.16), NimbusHost dönen halkalı elektrik sabotajı (v1.9.17).~~ — İKİ VERTICAL SLICE EKLENDİ.
- ~~**Skill/level katmanı:** XP/level, senaryo innate rankları, SNEAKY/ENDURANCE, UI ve schema v12 migration.~~ — v1.9.18'de TAMAMLANDI.
- ~~**Fraud fatigue slip-up + kimlik baskısı:** günlük peak bandları, cover kararı, üç aşama, schema v14.~~ — v1.9.19'da TAMAMLANDI.
- **Mobil yayın** — önce mobil layout geçişi (3 sütun → sekmeli görünüm, 44px dokunma hedefleri, safe-area, visibilitychange pause), sonra **Capacitor** sarmalama (Electron'un mobil karşılığı; oyun mantığına dokunulmaz). iOS'ta localStorage yerine Capacitor Preferences. (ONAYLANDI, yukarıdakilerden sonra)
- ~~4. senaryo, başarımlar, oyun modları, klavye kısayolları~~ — v1.1'de EKLENDİ.
- **GitHub Pages demo yayını** — `dist/`i yayınlayan tek workflow; oyun linkle paylaşılabilir olur.
- **Steam paketleme:** `electron-builder` (.exe/.app) + `steamworks.js` (achievements — `achievements.js` 1:1 map'lenmeye hazır).
- **Multiplayer** (en son; server ister, GDD §11).

---

# 11. Previous Decisions

| Karar | Gerekçe | Değiştirilebilir mi? |
|---|---|---|
| ~~Tek dosya, vanilla JS~~ → **React 18 + Vite 7** (React geçişi 2026-07-05; Vite 7 güncellemesi 2026-08-07) | Kullanıcı Steam hedefiyle birlikte "reacte geçir, dışarıdan bakan neyin nerede olduğunu anlasın" dedi; mantık `src/game/` (saf JS), UI `src/components/` olarak ayrıldı. Vite 7 güncel güvenlik/toolchain tabanı | Kullanıcı kararı; geri dönüş yok. Eski tek dosya sürüm git geçmişinde (commit "v2") |
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
| ~~PAUSE ekranı masayı kapatır~~ → v1.5'te PAUSE tamamen kaldırıldı | Gerçek zamanlı sayaç gidince pause anlamsızlaştı; okuma baskısının yerini saat-bütçesi aldı | v1.5 kullanıcı kararı |
| Zaman = aksiyon bütçesi, gerçek zamanlı sayaç DEĞİL (v1.5) | Kullanıcının açık isteği: kurgusal 8 saatlik mesai, iş başına saat maliyeti, mesai+yorgunluk döngüsü | Kullanıcı kararı; maliyet/yorgunluk sayıları tuning serbest |
| Lisans: All Rights Reserved (LICENSE dosyası, 2026-07-10) — açık kaynak DEĞİL, "viewing only" | Kullanıcı Steam'e çıkacak; Apache/MIT gibi izin veren lisanslar bilinçli REDDEDİLDİ | Kullanıcı istemeden açık kaynak lisansına geçme |
| Karakter yürüyüş animasyonu CSS keyframe (SVG `<g>` üzerinde), JS animasyon kütüphanesi yok | Bağımlılık yasağı + basitlik | Koru |
| Zorluk = bilgi bulanıklığı, zar matematiği DEĞİL (v0.7) | Kullanıcı isteği; aralık merkezden kaymalı + stabil olmalı ki ortası/titremesi gerçek değeri sızdırmasın | Aralık genişlikleri (FUZZ) tuning serbest; "zar değişmez" ilkesi korunur |

---

# 12. Claude Code Startup Instructions

Sen bu projeye yeni katılan geliştiricisin. Şunları bilmelisin:

1. İlk olarak `DEV_LOGBOOK.md` dosyasını oku; güncel checkpoint, aktif iş ve iki araç arasındaki çalışma protokolü oradadır. Proje `fancy-outfits/` klasöründe; React 18 + Vite 7 (Node ≥22.12). Oyun mantığı `src/game/` (saf JS, React'ten bağımsız), UI `src/components/`. `FANCY_OUTFITS_GDD.md` gelecek özelliklerin spec'i, bu `CLAUDE.md` tam bağlam.
2. Çalıştırmak: `npm run dev` (tarayıcı), `npm start` (Electron/Steam hedefi). Her değişiklikten sonra `npm run build` ile doğrula, davranışı tarayıcıda elle test et.
3. Dokunmadan önce oku: `src/game/engine.js` içinde `chance()` (denge), `apply()` (tüm stat mutasyonu buradan) ve `endDay()` (gün akışı); dava JSON şeması (CLAUDE.md §7, gerçek veri `src/game/content.js`).
4. Kırmızı çizgiler: yeni runtime bağımlılığı/asset dosyası ekleme; oyun metinlerine "Suits/Papers Please" yazma; safe-vs-bluff çekirdek gerilimini bozma; `apply()`'ı bypass etme; `src/game/` ↔ `src/components/` katman ayrımını bozma; oyun dili İngilizce kalır, kullanıcıyla Türkçe konuşulur.
5. İlk iş adayları: §10'daki kalan buglar (#3, #4) ve kullanıcıya §10'daki özellik listesinden hangisini istediğini sormak. Muhtemel cevap NPC ilişki sistemi (spec: GDD §5) — ama başlamadan onay al.
6. Kod stili: `src/game/` kompakt (tek satır guard'lar, ternary'ler), tuning sabitleri `constants.js`'te; componentler sade JSX.
