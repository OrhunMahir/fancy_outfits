# FANCY OUTFITS — ajanlar için giriş kapısı

Bu dosya `AGENTS.md` olduğu için Codex tarafından otomatik okunur. **Kasıtlı olarak kısadır.**

Daha önce burada `CLAUDE.md`'nin 491 satırlık bir kopyası duruyordu. Kopya çürüdü, bir ajan
onu güncel sanıp yanlış checkpoint'ten devam etti (bkz. `CLAUDE.md`, "Dış denetim notu"). O
yüzden burada tekrar eden hiçbir içerik yok — yalnız nereye bakılacağı ve pazarlığa kapalı
kurallar.

## Önce şunları oku, bu sırayla

1. **`DEV_LOGBOOK.md`** — en üstteki kayıt güncel checkpoint'tir: son turda ne yapıldı, hangi
   tuzaklara düşüldü, sıradaki kesin adım ne. **Tek "şu an neredeyiz" kaynağı budur.**
2. **`CLAUDE.md`** — tam bağlam: mimari, dosya haritası, sürüm sürüm ne eklendiği, geçmiş
   kararlar ve gerekçeleri.
3. **`FANCY_OUTFITS_GDD.md`** — henüz yazılmamış özelliklerin tasarım spec'i.
4. **`README.md`** — İngilizce vitrin + changelog. Her sürümde güncellenir.
5. **`BALANCE_SOAK_REPORT.md`** — denge sabitlerine dokunacaksan önce bu.

Sürüm numarası için `package.json`'a bak; `README.md` changelog'unun en üstteki girdisiyle
aynı olmalı.

## Başlamadan

```bash
git status --short --branch && git log --oneline -3
```

Kullanıcının yarım işi ya da başka bir aracın açık değişikliği olabilir; üzerine körlemesine
yazma.

## Pazarlığa kapalı kurallar

- **Yeni runtime bağımlılığı yok.** `react` ve `react-dom` dışında. devDependency serbest.
- **Görsel/ses asset dosyası yok.** Sesler `sound.js`'te sentezleniyor, grafikler runtime SVG.
  İstisnalar bilinçli ve gerekçeli: gömülü font (`src/fonts/`, OFL) ve `assets/logo/` — ki o
  da `scripts/build-logo.mjs` ile **koddan üretiliyor** (`src/game/logo.js`).
- **`Math.random` yasak.** Oyun mantığında `utils.js`'ten `rand()`/`rnd()`. Tek istisna
  `sound.js` (ses jitter'ı deterministik akışı tüketmesin).
- **Stat değişimi yalnız `apply(fx)` üzerinden.** Elle `S.rep += x` yazma.
- **Katman ayrımı:** `src/game/` React import etmez (`useGame.js` hariç); `src/components/`
  oyun kuralı içermez — zar atmaz, stat hesaplamaz.
- **Save formatı değişirse** aynı değişiklikte schema migration + strict validation + reload/
  tamper testi gelir. Yarım bırakılmaz.
- **Minigame sonucu davayı otomatik kazandırmaz.** Yalnız kanıt/dossier/teknik avantaj verir.
- **Çekirdek gerilim korunur:** safe = %100 ama Boldness yer; blöf Boldness'a bağlıdır ve
  başarısızlığı Reputation yakar.
- **Oyun içi metin İngilizce**, kod yorumları İngilizce, kullanıcıyla iletişim Türkçe.
- **Oyun metinlerinde "Suits"/"Papers Please" geçmez.** Parodi isimler serbest.
- **Commit/push kullanıcıya aittir.** Push etmeden sor. Commit'te yalnız kullanıcının adı
  görünür — `Co-Authored-By` eklenmez.

## Her değişiklikten sonra

```bash
npm run build && npm test
```

`npm test` yalnız derlenmeyi değil, save schema'sını, migration'ları, board bütünlüğünü,
paketleme ayarlarını ve offline çalışmayı da doğrular. Denge sabitine dokunduysan ayrıca
`npm run test:soak`.

Davranışı tarayıcıda elle de dene: `npm run dev`. Masaüstü kabuğu: `npm start`.
Paketleme: `npm run pack` (hızlı), `npm run dist:mac` / `npm run dist:win`.

## Oturum sonunda

`DEV_LOGBOOK.md`'nin **en üstüne** yeni tarihli bir kayıt ekle: ne yapıldı, hangi tuzaklar
çıktı, hangi testler koştu, sıradaki kesin adım. Yeni sürümse `README.md` changelog'una
detaylı bir girdi ekle — bu kural atlanmaz.
