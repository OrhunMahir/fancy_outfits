# FANCY OUTFITS — Deterministik Kariyer Soak Raporu

**Sürüm:** v19.12 (v19.9 baseline + progression, controlled-risk ve FIRM endgame A/B turları)

**Tarih:** 2026-08-08

**Kapsam:** Standard 40 gün, Endless 50–80 gün; beş senaryo; denge, uzun-run
bütünlüğü ve şüpheli seed tekrarları.

## v19.12 FIRM endgame A/B — uygulanan karar

v19.9–v19.11'de FIRM COLLAPSE teorik olarak vardı ama Name Partner sonrası FIRM çoğunlukla
100'e yapışıyordu. Bu tur `apply()` üzerinden gerçek FIRM akışını `case`, `delayed`,
`delegated`, `review`, `objective`, `client_event`, `deadline`, `retainer`, `roster`, `payroll`,
`firing` ve diğer kaynaklara ayırdı. Ayrıca roster win/loss, ham/cap'li drift, çalışan-günü,
kovma etkisi, lawsuit ve tavanda kırpılan pozitif FIRM kaydediliyor.

### Kök neden

- Name Partner'a ulaşan kariyerler FIRM'e ortalama **92,27** ile giriyordu; 15 eşiğine karşı
  yaklaşık 77 puan tampon vardı.
- Eski roster sonucu simetrik `+1/−1` idi ve ortalama kadro pozitif PERFORMANCE'a eğilimliydi.
- İyi yönetim eski modelde post-NP günlerinin **%53,7**'sini 100 FIRM'de geçiriyor, kariyer
  başına ortalama **52,81** pozitif FIRM tavanda kırpılıyordu.
- UI'daki `IMPACT n/day` ifadesi de doğru değildi: değer günlük doğrudan artış değil,
  %30 ihtimalle çalışan personelin başarı zarını `50+impact×8` değiştiriyordu.

### İzole adaylar

Sabit günlük −1/−2 gider, yalnız roster loss −2, düz −1+loss −2 ve kadro boyuna bağlı
payroll+loss −2 aynı seed'lerde denendi. Yalnız loss veya yalnız hafif gider yeterli ayrım
yaratmadı. Seçilen model:

- sabah payroll = `ceil(roster.length / 10)` FIRM;
- her personel sabah %30 ihtimalle iş yapar;
- win `+1`, loss `−2` FIRM;
- `FIRM_COLLAPSE(15)` **değişmedi**.

Bu model kadro kalitesiyle headcount'u aynı karara bağlıyor: zayıf çalışanı kovmak drift'i
düzeltip 11→10 personel sınırında payroll'u −2'den −1'e indirebilir; fakat kovmanın anında
−2 morali, delegasyon kaybı ve kalıcı lawsuit heat'i korunuyor.

### Final paired sonuç

64 seed × 5 senaryo × 2 yönetim politikası × eski/yeni kural = **1.280 Endless kariyer**;
her politika/varyantta 232 kariyer Name Partner'a ulaştı. **132/132 replay birebir aynı**,
invariant ihlali 0:

| Kural / politika | Collapse | Ortalama post-NP gün | FIRM delta | Delta/gün | 100 FIRM günü |
|---|---:|---:|---:|---:|---:|
| Eski · iyi yönetim | %0 | 31,90 | −0,56 | −0,261 | %53,7 |
| Eski · kötü yönetim | %0 | 27,54 | −9,11 | −0,435 | %37,2 |
| **Yeni · iyi yönetim** | **%3,4** | **31,35** | **−29,84** | **−1,503** | **%4,0** |
| **Yeni · kötü yönetim** | **%12,5** | **26,75** | **−47,40** | **−2,129** | **%2,0** |

Yeni iyi-yönetim collapse'larının medyanı Name Partner'dan 34 gün, kötü yönetimin
37 gün sonrası. Kötü yönetimde roster neti `−10,38`, firing `−10,26`; iyi yönetimde
roster neti `+2,95`, firing `−4,75`. Yani fark yalnız pasif vergi değil, görünür kadro
kararlarından geliyor.

### Şüpheli seed ikinci testi

- `2874639184`, Fraud / iyi yönetim: nadir kuyruğun gerçek olduğu doğrulandı; gün 21 NP,
  gün 72 FIRM 14 ile collapse. İki tekrar aynı digest: `3e3a94b5...47b13`.
- `3731324953`, Fraud / kötü yönetim: en iyi çalışanları kovma, 3 firing + 2 lawsuit
  sonrası gün 38'de FIRM 13. İki tekrar aynı digest: `2ffb98b0...242c5`.

Kalan ana denge riski artık FIRM değil, Endless hakim hafızası doygunluğu: bu final matriste
birçok Technical hücrede gün 20 sonrası `+6` cap oranı %55–62 bandında kaldı (**6/10**).

> Aşağıdaki v19.11 bölümü controlled-risk kararını, sonraki bölümler tarihsel baseline'ı korur.

## v19.11 kontrollü risk ve Boomerang kök-neden turu

Bu tur canlı oyunu kolaylaştırmadan iki soruyu ayırdı: “ölçülü agresif oynayan gerçekçi rota
yaşayabiliyor mu?” ve “Boomerang gerçekten aşırı zor mu?” Soak runner'a yalnız görünür bilgiyi
kullanan `bold_mixed` politikası; rakip INF'ini `passive/failure` ayıran probe; delegated W/L,
deadline, rival action, final NPC ilişkisi, aggressive fırsat bandı ve promotion-ready günü
telemetry'si eklendi.

### Kontrollü rota sonucu

64 seed × 5 senaryo × 3 politika ile **960 Standard kariyer** çalıştı; **79/79 replay aynı**,
invariant ihlali 0:

| Politika | Win | Medyan final | FIRED | Miss/run | Aggressive payı | Hata kaynaklı rakip INF |
|---|---:|---:|---:|---:|---:|---:|
| Technical | %69,4 | 21 | %5,6 | 1,05 | %0 | 39,99 |
| Mixed | %62,8 | 21 | %6,9 | 1,31 | %4,3 | 41,56 |
| **Bold Mixed** | **%63,4** | **21** | **%14,4** | **0,82** | **%9,0** | **34,52** |

Bold Mixed bu nedenle “pure aggressive spam” değildir: gerektiğinde safe/technical'a döner,
ama yeterli tampon varken düşük görünen blöfü gerçekten dener. Kazanımı Technical'a yakın,
kovulma ihtimali yaklaşık 2,6 kat; kısa çalışma süresi sayesinde deadline ve rakibe hata besleme
daha düşük. Risk–ödül rotası oynanabilir ve belirgin biçimde daha tehlikelidir.

### Boomerang şüphesinin gerçek nedeni

Eski Mixed politika tüm Boomerang NPC'lerini başlangıçta yaklaşık %55 görüp kendi %60–65
delegasyon eşiği yüzünden **hiç delege etmiyordu**. Bu, oyunun izin vermediği bir davranış değil,
test botunun aşırı ihtiyatıydı:

| Boomerang Mixed | Win | Delegasyon/run | Miss/run | Hata kaynaklı rakip INF |
|---|---:|---:|---:|---:|
| Eski model | %21,9 | 0 | 4,30 | ölçüm öncesi |
| Düzeltilmiş model | **%71,9** | **14,23** | **1,20** | **41,77** |
| Technical referans | %73,4 | 18,78 | 1,09 | 37,64 |
| Bold Mixed | %64,1 | 14,45 | 0,58 | 35,77 |

Aynı seed corpusunda `2874639110`, eski modelde 0 delegasyon + 9 miss ile OUTPACED iken yeni
modelde 16 delegasyon + 0 miss ile 21. gün Name Partner oldu. Yeni koşu iki kez replay edildi;
iki trace digest de `7d8a6193...74ac`, sonuçlar birebir aynı. Bu nedenle Boomerang başlangıç REP,
ilişki, deadline, rival veya NPC oranlarına canlı buff uygulanmadı.

### Reddedilen Aggressive ödül artışı

`AGG_INF_MULT` için 1,25 / 1,50 / 1,75 A/B'si 32 seed × 5 senaryo × 3 varyant = 480 kariyerde
aynı `%59,4` kazanım ve 21. gün medyan verdi. Test hook'unun gerçek draw-time INF'i değiştirdiği
ayrı regresyonla doğrulandı; etkisizliğin nedeni implementasyon hatası değil, cuma beklerken INF'in
100 tavanında kırpılmasıdır. Sayıyı büyütmek oyuncuya görünmeyen sahte ödül olacağı için reddedildi.

Kalan tasarım notu (**5/10**): Technical, Mixed ve Bold Mixed promotion-ready medyanları kabaca
4 / 7 / 11 / 16. günlerde, gerçek terfiler 6 / 11 / 16 / 21'de kümeleniyor. Friday cadence
v19.10'un erken-final sorununu çözüyor fakat başarılı agresif oyuna final günü hız farkı bırakmıyor.
Bunu bozmadan çözmek, sayı artışından çok ayrı bir “exceptional review/overflow” tasarımı ister;
bu turda canlıya alınmadı.

> Aşağıdaki v19.10 bölümü progression kararını, sonraki bölümler v19.9 baseline kanıtını korur.

## v19.10 A/B güncellemesi — uygulanan karar

v19.9'da doğrulanan hızlı kariyer sorunu dört ayrı adayla gerçek engine üzerinde ölçüldü.
Pozitif INF artık `case`, `big_case`, `delayed`, `delegated`, `favor`, `objective`, `review`,
`crisis`, `client_event`, `demand`, `story`, `weekend`, `rival`, `decor` ve `other` olarak exact
kaynak etiketiyle toplanıyor; stat formülü kopyalanmıyor. Ek olarak görünür bilgi kullanan kontrollü
`mixed` ve Name Partner sonrası yalnız işletmeyi zorlayan `firm_only_stress` politikaları eklendi.

### Aday karşılaştırması

| Aday | Technical win | Medyan final | Gün 12'ye kadar final | Karar |
|---|---:|---:|---:|---|
| v19.9: anlık terfi, 2 delege/gün | %98,4 | 10 | %96,9 | reddedildi |
| Yalnız delegasyon INF ×0,5 | %100 | 11 | %85,6 | sorunu çözmedi |
| Dağıtılmış INF kesintileri | %100 | 11 | %75,6 | sorunu çözmedi |
| Yalnız Friday promotion, 2 delege/gün | %96,9 | 21 | %0 | süreyi çözdü, güvenliği çözmedi |
| **Friday promotion + 1 delege/gün** | **%69,4** | **21** | **%0** | **uygulandı** |

İlk üç deney 32 seed × 5 senaryoda 160 Technical kariyerle; final seçim 64 seed × 5
senaryoda 320 Technical kariyerle ölçüldü. Uygulanan adayın senaryo sonuçları Fraud %65,6,
Debtor %68,8, Legacy %65,6, Defector %73,4 ve Boomerang %73,4; kazananların tamamında medyan
final 21. gün. Böylece önceden belirlenen %60–80 win, 18–24 gün medyan ve <%25 erken-final
hedeflerinin üçü de karşılandı.

Eski Technical kariyerde brüt pozitif INF'in en büyük exact kaynakları doğrudan dava 26,48,
delegasyon 24,60, objective 11,98, kriz 8,32, demand 7,71 ve delayed reply 7,70 INF/run çıktı.
Sorun tek bir ödül katsayısı olmadığı için ödülleri sessizce budamak yerine kariyer ritmi ve iş
kapasitesi değiştirildi. Safe %100, zar matematiği, dava ödülleri ve NPC başarı oranları korunuyor.

Final paired Standard doğrulaması **1.280 kariyer, 96/96 replay, 0 invariant ihlali**;
Endless doğrulaması **1.920 kariyer, 201/201 replay, 0 invariant ihlali** verdi. Save schema v5,
`promotionReviewDay` ve `promotionHintRank` alanlarını migrate/validate ederek reload ile aynı
cuma kararının ikinci kez çalışmasını engelliyor.

### Kalan gözlemler

- `mixed` politika genelinde %52,8 kazandı; Boomerang özelinde %21,9 ve %29,7 sürdürülen backlog
  baskısı görüldü (**5/10**). Aynı senaryonun görünür Technical rotası %73,4 olduğundan global
  denge imkânsız değil; sonraki senaryo turunda Boomerang'ın düşmanca NPC başlangıcı ayrıca ölçülmeli.
- Uygulanan Endless adayında Technical Name Partner oranı %75, medyan gün 21. Fakat izole
  `firm_only_stress` içinde 176 Name Partner kariyeri / 1.441 post-NP günde **0 doğal FIRM
  COLLAPSE** görüldü (**7/10**). Bu progression değişikliğinin yan etkisi değil, sıradaki endgame A/B'si.
- Hakim teknik hafızasının +6 tavanına Endless gün 20 sonrası sık ulaşması tekrarlandı (**6/10**).
  Ödül/terfi turuna karıştırılmadı; rolling-window veya cuma decay adayı ayrı ölçülmeli.

> Aşağıdaki bölümler v19.9 baseline taramasını ve bu A/B turuna götüren kanıtı korur.

## 1. Sonuç

Oyun motoru uzun koşuda deterministik ve tekrar üretilebilir durumda. Toplam **3.520
kariyer** çalıştırıldı; otomatik seçilen **252/252 şüpheli veya uç koşu** aynı seed ve
politika ile birebir aynı sonucu verdi. Test matrisi boyunca **0 bütünlük ihlali** bulundu.

Buna karşılık denge tarafında iki net sorun doğrulandı:

1. Görünür **TECHNICAL** yaklaşımı ve delegasyon birlikte Standard kariyeri fazla güvenli
   ve kısa yapıyor: 315/320 kazanım, medyan 10. günde Name Partner.
2. Endless yönetim oyununda amaçlanan **FIRM COLLAPSE**, kişisel REP kaybı nedeniyle
   çoğunlukla devreye giremiyor: firmayı özellikle yıkmaya çalışan botta bile Name Partner
   sonrası bitişlerin yalnız 6/315'i collapse, 301/315'i FIRED.

Hakim hafızası Standard'daki hızlı terfinin sebebi değil. Fakat Endless'ta teknik başarıyı
kalıcı biçimde pekiştiren pozitif bir snowball'a dönüşüyor. Inbox büyümesi ise kontrol altında;
mesaj limiti çalışıyor ve dava backlog'unda sınırsız büyüme görülmedi.

Bu turda **oynanış denge sabitleri değiştirilmedi**. Yalnız tekrar üretilebilen bütünlük,
save ve uzun-run büyüme hataları düzeltildi. Denge değişiklikleri ölçümlü A/B turuna bırakıldı.

## 2. Yöntem ve güvenilirlik

### Test matrisi

| Boyut | Değer |
|---|---|
| Senaryolar | Fraud, Debtor, Legacy, Defector, Boomerang |
| Standard | 5 politika × 5 senaryo × 64 seed = 1.600 kariyer, 40 gün tavanı |
| Endless | 6 politika × 5 senaryo × 64 seed = 1.920 kariyer, 50 gün tavanı |
| Toplam | **3.520 kariyer** |
| Replay | **252/252 eşleşme** |
| Motor invariant ihlali | **0** |

Her kariyerde oyun motorunun gerçek public aksiyonları kullanıldı. Simülatör doğrudan stat
yazmadı; dosya seçme, seçenek oynama, delegasyon, kriz, mesai, gün sonu, işe alma/kovma ve
save akışlarını oyuncu gibi çağırdı. Oyun RNG'si ile botun karar RNG'si ayrıldı; böylece bir
politikanın fazladan karar vermesi DAILY/oyun zarlarını tüketmedi.

### Politikalar

| Politika | Ne ölçüyor? | Sınırı |
|---|---|---|
| `max_chance` | Gerçek başarı ihtimali en yüksek seçeneğe giden aşırı güvenli bot | Oyuncunun bulanık ekranda göremediği exact oranı bilir |
| `technical` | Görünen stil etiketinden TECHNICAL seçen, uygun işi delege eden pratik baseline | Metni anlamaz; etiketi kullanır |
| `aggressive` | Her fırsatta AGGRESSIVE seçerek risk ekonomisini zorlar | Bilinçli olarak kötü/tek yönlü oynar |
| `oracle_ev` | Gizli sonuç bilgisine dayalı güçlü karar heuristiği | İnsan baseline'ı veya matematiksel üst sınır değildir |
| `chaos` | Seed'li rastgele seçimle guard ve nadir akışları zorlar | Denge önerisi için değil, bütünlük için değerlidir |
| `firm_stress` | Name Partner'a çıktıktan sonra yüksek etkili çalışanları kovup FIRM'i zorlar | REP, backlog ve fatigue ile karışan yıkıcı bir stress testidir |

### Tekrar üretilebilirlik

- Node: `v24.11.1`, macOS arm64.
- Baz commit: `7aaba2be4ba994db16a8c709f247426e80377938`.
- Koşu temiz commit üzerinde değildi; test başlangıcı ve bitişindeki dirty snapshot hash'i
  aynıydı: `7dad847f5b97ca67f46d0e885a80d6ea238474f084d8674e6dd7184a03975759`.
- Simülatör hash'i: `85b7fbe2a32a2a33bca56d00b128bb7b30f1bb55ab1a2dafde16d447c4be1a6d`;
  engine hash'i: `5136ff7aa1b4c02c5c69738a9d2e9b8e6db13be832df264e2ff18856be1b0ce3`.
- Kaynaklar koşu sırasında değişmedi (`sourceUnchanged: true`).
- Tam ham çıktı geliştirme sırasında `/private/tmp/fancy-soak-final-v4.json` altında üretildi;
  11 MB'lık geçici telemetry dosyası repoya eklenmedi.

Bu nedenle sonuçlar aynı snapshot için güvenilir ve replay edilebilir; ancak sonuçlar temiz bir
release commit'inin etiketi olarak yorumlanmamalıdır.

## 3. Denge bulguları

### 3.1 Technical rota kariyeri fazla hızlı bitiriyor — **9/10**

Standard `technical` sonucu:

- 315/320 (**%98,4**) Name Partner.
- 310/320 (**%96,9**) en geç 12. günde Name Partner.
- Medyan final terfi: **10. gün**.
- Medyan terfi günleri: **4 / 6 / 9 / 10**.
- Başarılı kariyerlerde en geç final: 14. gün.
- Run başına ortalama 12,125 delegasyon, 0 deadline miss ve yalnız 0,003 overtime bloğu.
- Seçim karışımı: %27,5 SAFE, %72,5 TECHNICAL.
- Çözülen teknik zarlar: 3.160/4.445 başarı (**%71,1**).

En hızlı doğrulanmış Name Partner günleri:

| Senaryo | Gün |
|---|---:|
| Fraud | 8 |
| Debtor | 8 |
| Legacy | 6 |
| Defector | 7 |
| Boomerang | 7 |

Pozitif brüt INF attribution'ı run başına 86,92:

| Kaynak grubu | INF/run | Pay |
|---|---:|---:|
| Doğrudan dava sonucu | 29,544 | %34,0 |
| Event/kriz | 19,419 | %22,3 |
| Sabah çözümü | 22,747 | %26,2 |
| Gün sonu | 15,206 | %17,5 |

Buradaki değerler **net INF değil**, pozitif aksiyon delta'larının attribution'ıdır. Sabah grubu
delegasyon, delayed reply ve diğer dawn sonuçlarını birlikte taşıyor. Dolayısıyla yalnız technical
dava ödülünü azaltmak sorunun en fazla üçte birine dokunur; önce bu grubu alt kaynaklara ayırmak
gerekir.

### 3.2 Yaklaşım ekonomisi iki uçlu — **8/10**

| Standard politika | Name Partner | Medyan terminal gün | Baskın davranış |
|---|---:|---:|---|
| `max_chance` | 2/320 (%0,6) | 12 | %96,8 SAFE |
| `technical` | 315/320 (%98,4) | 10 | %72,5 TECHNICAL |
| `aggressive` | 10/320 (%3,1) | 2 | %100 AGGRESSIVE |
| `oracle_ev` | 318/320 (%99,4) | 10 | %69,7 TECHNICAL, %29,8 SAFE |
| `chaos` | 5/320 (%1,6) | — | %44,3 AGGRESSIVE |

“Daima en yüksek ihtimali seçmek” kazanma stratejisi değil: exact oranı bilen bot bile çoğunlukla
SAFE seçerek neredeyse hiç kazanamıyor ve ortalama 4,94 deadline kaçırıyor. Baskın yol, UI'da açıkça
görünen TECHNICAL etiketi ile delegasyonun iş yükünü temizlemesinin birleşimi. Pure aggressive ise
çok sert; başarı oranı %37 ve ölümlerin medyanı 2. gün.

### 3.3 FIRM endgame'i kişisel kovulmanın arkasında kalıyor — **8/10**

Normal Endless Technical:

- 315/320 Name Partner; medyan 10. gün.
- Toplam 11.039 Name Partner sonrası gün.
- **0 FIRM COLLAPSE**.
- Gözlenen minimum FIRM 56; final ortalama FIRM 96,12.

Firm-stress, Name Partner'a çıktıktan sonra firmayı özellikle yıkmasına rağmen:

| Name Partner sonrası sonuç | Sayı | Oran |
|---|---:|---:|
| FIRED | 301 | %95,6 |
| FIRM COLLAPSE | 6 | %1,9 |
| Debt default | 7 | %2,2 |
| 50. gün horizon | 1 | %0,3 |

315 Name Partner kariyeri 4.197 post-NP gün üretti. On iki kariyer FIRM'i gerçekten 15'in altına
indirdi, fakat yalnız altısı collapse ile bitti; diğer yarısında kişisel terminal sonuç önce
çalıştı. Stress botunun medyan 7 deadline miss'i ve %22,2 sent-home oranı da sonucu REP/fatigue ile
karıştırıyor. Eşik veya ceza değiştirmeden önce kişisel caseload'u koruyup yalnız payroll/FIRM'i
zorlayan temiz bir politika eklenmeli.

### 3.4 Hakim hafızası Endless'ta pozitif snowball — **6/10**

Standard Technical'da +6 tavan yalnız 34/1.362 duruşmada (%2,5), −6 tavan 1/1.362 duruşmada
(%0,1) göründü. Bu yüzden hakim hafızası 10 günlük hızlı Standard kariyerin sebebi değil.

Endless Technical'da ise:

- 10.640 teknik duruşmanın %41,1'i +6 tavanda.
- 20. günden sonra 3.805/6.534 (**%58,2**) +6 tavanda.
- Negatif −6 tavan tüm kariyerde %2,4; 20. günden sonra %2,9.
- İlk tavan görünümünün medyanı üçüncü karşılaşma.
- Ortalama teknik memory modifier: +3,04.

Mevcut +4 teknik win / −3 loss yapısı, iki galibiyetten sonra üçüncü karşılaşmada tavana ulaşabiliyor.
Hafıza çalışıyor ve küçük tek-karşılaşma modifier sınırını koruyor; sorun uzun kariyerde olumlu
geçmişin neredeyse kalıcı hale gelmesi. Rolling son N duruşma veya haftalık decay A/B testi daha
hedefli olur.

### 3.5 Senaryolar arası fark — **6/10**

Standard Technical:

- Fraud, Debtor, Legacy ve Defector: 64/64 kazanım.
- Boomerang: 59/64 kazanım, 5 FIRED; buna rağmen kazananlarda medyan 9. gün.
- Debtor: 0 default, final para medyanı $5.607,5; en düşük $405.
- Legacy en hızlı rota: medyan 8. gün.

Endless Technical'da Legacy, Name Partner'a hızlı ulaşmasına rağmen NP sonrası 40/64 (%62,5)
FIRED ile en kırılgan senaryo. Diğer senaryoların NP sonrası fired oranı yaklaşık %8,5–21,9.
Boomerang başlangıçta kırılgan, fakat NP'ye ulaşanları en dayanıklı grup. Global progression
düzeltmesi yapılmadan senaryo bazında ayrı nerf/buff uygulanmamalı.

### 3.6 Backlog baskısı var, runaway yok — **4/10**

“Sürdürülen backlog” ölçümü: en az üç gün `peak > 15` ve son on günlük lineer eğim `> 0,4`.

| Politika | Sürdürülen backlog |
|---|---:|
| Standard Technical | 0/320 |
| Endless Technical | 6/320 (%1,9) |
| Endless Oracle | 58/320 (%18,1) |
| Firm-stress | 118/320 (%36,9) |

3.520 koşunun global maksimum backlog'u 22. `max > 30` ve pozitif kuyruk eğimi taşıyan run yok.
Şimdilik günlük dosya gelişini azaltmak için kanıt yok; progression uzatılırsa yeniden ölçülmeli.

### 3.7 Mesaj sınırı çalışıyor — **3/10**

- Global maksimum mesaj sayısı tam 80; 80'i aşan kariyer yok.
- 368/3.520 kariyer limite ulaştı.
- Endless Technical: 280/320 limite ulaştı.
- 50. güne yaşayan 298/298 kariyer limite ulaştı.

Bu bir bellek/save büyümesi değil artık. Kalan karar UX kararıdır: eski bildirimlerin kaybolması
kabul edilecek mi, yoksa ayrıca özet/arşiv mi gösterilecek?

### 3.8 Fatigue ve rakip — **4/10**

- Standard Technical'da sent-home yok.
- Endless Technical'da %0,9; Oracle'da %18,8; firm-stress'te %21,9.
- OUTPACED Standard matriste yalnız bir kere görüldü.

Fatigue sonucu büyük ölçüde politika davranışına bağlı. Rakip ise 10 günlük kariyerde çoğunlukla
yarışacak zaman bulamıyor. İkisi de progression uzatıldıktan sonra yeniden ölçülmeli; bugün ayrı
bir sayı değişikliği desteklenmiyor.

## 4. Doğrulanan bütünlük hataları ve düzeltmeler

| Önem | Doğrulanan olay | Düzeltme ve regresyon |
|---:|---|---|
| **10/10** | Geceye sarkan iş, saati negatif kaydedebiliyor; save daha sonra geçersiz sayılıyordu. | Saat tüketimi 0'da clamp edildi. Gerçek `latework → lateGo → choose` zinciri ve eski şüpheli seed test edildi. |
| **9/10** | Aynı sabah birden fazla reply/delegation sonucu art arda terfi kontrolü yaparak Endless Name Partner özetini ezebiliyordu. | Sabah sonuçları topluca çözülüyor, sonra tek terfi kontrolü yapılıyor. Cumartesi çift-sonuç regresyonu eklendi. |
| **9/10** | Stale veya çift tıklanmış crisis/overtime seçeneği sonucu ikinci kez uygulayabiliyordu. | Yalnız aktif event'in birebir option nesnesi kabul ediliyor; tekrar çağrı strict no-op. |
| **8/10** | Prosedürel ID sayacı reload'da sıfırlanıyor, nested generated appeal ID'siz kalabiliyordu. | Persist edilen `caseSeq`, schema v4 migration ve tüm generated/follow-up/big/lawsuit dosyalarında stabil ID. |
| **8/10** | Lazy veya artık roster'da olmayan NPC, deadline'ı geçmiş işi yeniden canlı masaya döndürebiliyordu. | Orijinal deadline geçmişse dosya anında miss olarak yakılıyor; yalnız hâlâ geçerli dosya geri dönüyor. |
| **8/10** | Endless düşük-FIRM son terfisi önce “win” kaydı oluşturabiliyor; sonradan uzayan kariyer lifetime stats'i güncellenmiyordu. | Collapse önceliği ve run sayısını iki kez artırmadan eventual best day/rank güncellemesi eklendi. |
| **8/10** | Save doğrulaması live `dueDay`, güvenli/ileride `caseSeq` ve delegated `silent` tipi gibi alanları eksik kontrol ediyordu. | Schema v4 validation ve bozuk-save regresyonları eklendi. |
| **8/10** | Inbox notification mesajları sınırsız büyüyerek uzun run DOM/save boyutunu artırıyordu. | En yeni 80 bildirim tutuluyor; live case'ler silinmiyor. Eski save load sırasında onarılıyor. |
| **6/10** | İki saatlik overtime bloğu yalnız tek saatlik fatigue hazard zarı atıyordu. | Çok saatli bileşik risk tam blok üzerinden hesaplanıyor. |
| **5/10** | Archive kaydı case ID taşımadığı için aynı başlıklı filing telemetry'de ayırt edilemiyordu. | Archive artık stabil filing ID'sini saklıyor. |

Ek bütünlük guard'ları:

- Stale/deleted NPC ID ile delegasyon strict no-op.
- Gerçek delege win/fail günlük `resolved` hedefini sayıyor; Lazy silent return saymıyor.
- Morning batch içinde Name Partner olduktan sonra aynı sabahın payroll/event üretimi özetin üstüne yazmıyor.
- Message repair canlı dava ID listesini birebir koruyor.
- Generated sequence, mevcut canlı/nested/archive ID'lerinin gerisindeyse save reddediliyor.

## 5. Şüpheli olayların ikinci testi

| Şüphe | Seed / koşu | Tekrar sonucu | Önem |
|---|---|---|---:|
| Fraud Technical aşırı hızlı final | `3731324955`, Standard | İki tekrar da Name Partner, gün 8 | 9/10 |
| Debtor Technical aşırı hızlı final | `2874639079`, Standard | İki tekrar da Name Partner, gün 8 | 9/10 |
| Legacy Technical aşırı hızlı final | `2874639086`, Standard | İki tekrar da Name Partner, gün 6 | 9/10 |
| Defector Technical aşırı hızlı final | `2874639079`, Standard | İki tekrar da Name Partner, gün 7 | 9/10 |
| Boomerang Technical aşırı hızlı final | `2874639110`, Standard | İki tekrar da Name Partner, gün 7 | 9/10 |
| En yüksek backlog | `3731324953`, Debtor Endless firm-stress | İki tekrar da max 22, FIRED gün 22 | 4/10 |
| Mesaj sınırı | `3731324947`, Fraud Endless Technical | İki tekrar da max 80, taşma yok | 3/10 |
| En düşük FIRM / collapse | `2874639145`, Boomerang Endless firm-stress | İki tekrar da FIRM 6, collapse gün 21 | 8/10 |
| Nadir pure-aggressive kazanım | `3731324949`, Legacy Standard | İki tekrar da Name Partner, gün 5 | 7/10 |
| Hakim +6 doygunluğu | `2874639115`, Boomerang Endless Technical | Gün 20 sonrası seçilen 25 teknik duruşmanın 23'ü +6; iki tekrar aynı | 6/10 |
| Eski negatif-saat şüphesi | `3731322775`, Fraud Standard Chaos | Düzeltme sonrası iki tekrar da geçerli saatle FIRED gün 3; ihlal yok | 10/10 |

Otomatik replay seçici yalnız bu örnekleri değil, her hücrenin hızlı/yavaş terminali, minimum
FIRM'i, maksimum backlog'u, mesaj tavanını, yorgunluk olayını ve sıra dışı bitişlerini kapsadı.
Toplam **252 replay'in tamamında** aksiyon izi, politika RNG cursor'u, archive digest'i ve final
state hash'i eşleşti.

## 6. Önerilen denge roadmap'i

### P0 — Ölçümü ayır ve progression A/B testi yap

1. Sabah INF attribution'ını `delegated`, `delayed reply`, `rival/ally`, `other dawn` olarak ayır.
2. Aynı 3.520-run matrisini üç adayla karşılaştır:
   - **A:** terfileri yalnız Partner Review gününde değerlendirme;
   - **B:** delegasyondan gelen terfi INF'ine günlük tavan veya daha düşük katsayı;
   - **C:** objective/review/morning INF paketini küçük ve dağıtılmış biçimde azaltma.
3. Geçici hedef bant: Standard Technical medyan final **18–24 gün**, gün 12'ye kadar final
   **%25'in altında**, toplam kazanım **%60–80**. Bu bant ürün kararıdır; kullanıcı onayından sonra
   kesin hedefe çevrilmeli.
4. Technical botun yanına metin ipucu kullanan ve kontrollü aggressive seçen gerçekçi karma bot
   ekle; yalnız stil etiketine dayalı baseline'a göre tuning yapma.

### P1 — Endless yönetim hedefini izole et

1. Kişisel davaları güvenli yöneten, yalnız roster/payroll kararlarıyla FIRM'i zorlayan
   `firm_only_stress` politikası ekle.
2. Önce terminal event sırası ve kovma/lawsuit sonuçlarının REP:FIRM dağılımını A/B et.
3. Ancak temiz stress testinde collapse hâlâ görünmiyorsa `FIRM_COLLAPSE(15)` eşiğini değiştir.

### P1 — Hakim hafızasına yaşlanma deneyi

İki seçenek ölçülmeli:

- son 4–5 duruşmayı tutan rolling memory;
- her cuma teknik güveni sıfıra doğru 1 azaltan decay.

Hedef, Standard'daki küçük anlatı etkisini korurken Endless gün 20 sonrası +6 tavan oranını
%58'den yaklaşık %20–35 bandına çekmek. Negatif aggressive hafızası ayrıca yeterli örnek üreten
kontrollü bir botla test edilmeli.

### P2 — Global ayardan sonra senaryo turu

- Legacy'nin post-NP REP kaybı yeniden ölçülmeli.
- Boomerang'ın ilk 10 gün kırılganlığı ile post-NP dayanıklılığı ayrı ele alınmalı.
- Debtor'ın ödemesi, uzatılmış kariyer matrisinde yeniden sınanmalı; bugünkü 10 günlük Technical
  kariyer borç baskısını ölçmek için fazla kısa.

### Şimdilik değiştirilmemesi gerekenler

- Günlük dosya geliş oranı: runaway backlog kanıtı yok.
- Fatigue/sent-home sayıları: politika bağımlı ve normal Technical'da düşük.
- Message cap: 80 sınırı teknik olarak doğru çalışıyor.
- Safe %100 çekirdek kuralı: sorun bu garanti değil, SAFE rotasının ilerleyememesi ile TECHNICAL
  rotasının aşırı hızlı ilerlemesi arasındaki uçurum.

## 7. Testleri tekrar çalıştırma

Hızlı regresyon ve küçük soak:

```bash
npm test
npm run test:soak
npm run build
```

Tam 64-seed matrisi:

```bash
npm run soak -- --json /private/tmp/fancy-soak.json
```

Tek bir şüpheli kariyeri iki kez replay edip karşılaştırma:

```bash
npm run soak -- --replay fraud,standard,technical,3731324955,40
```
