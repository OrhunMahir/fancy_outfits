# Steam yayın checklist'i

Bu dosya "App ID gelince ne yapılacak"ın tamamıdır. Sıralı; her adımın kimin işi olduğu
yazılı. App ID gelmeden yapılabilecek her şey **yapıldı** — aşağıda ✔ işaretli.

## Hazır olanlar ✔

| Ne | Nerede |
| --- | --- |
| Kapsül görselleri, Steam'in belgelediği 9 boyutta | `assets/store/capsules/` |
| Ekran görüntüleri, 9 adet, 1920×1080, gerçek oyundan | `assets/store/screenshots/` |
| Mağaza metni: kısa açıklama, uzun açıklama, özellikler, etiketler, sistem gereksinimleri | `assets/store/STORE_COPY.md` |
| Kütüphane logosu, şeffaf PNG | `assets/store/capsules/library-logo-1280x720.png` |
| Windows kurulum + taşınabilir zip | `npm run dist:win` → `release/` (CI de her push'ta üretir) |
| macOS `.app` (imzasız) | `npm run dist:mac` → `release/` |
| exe/app ikonları | `assets/logo/fancy-outfits.ico`, `.icns` |
| Save'ler dosya tabanlı (Steam Cloud'un tek anlayacağı şey) | `electron/store.js` |
| Windows'ta açılış/boyama/font/çevrimdışı/kayıt doğrulaması | `.github/workflows/windows-verify.yml`, her push |

Görseller ve ekran görüntüleri **üretiliyor**, elle çizilmiyor: `node scripts/store-capsules.mjs`
ve `node scripts/store-screenshots.mjs` (ikincisi `npm run dev` açıkken). Arayüz değişince
yeniden koş, yeniden yükle.

## Senin adımların (ben yapamam)

1. **Steamworks hesabı** — partner.steamgames.com, $100 App Fee, kimlik + vergi + banka
   bilgileri. Onay birkaç gün sürebilir.
2. **App ID al.** Gelince bana söyle; aşağıdaki her şey onunla açılır.
3. **Mağaza sayfası alanları** — metni `STORE_COPY.md`'den yapıştır, görselleri
   `assets/store/capsules/`'dan yükle. Kapsül adları hangi alana gittiğini söylüyor
   (`header-920x430` → Header Capsule, vb.).
4. **Fiyat, yayın tarihi, yaş derecelendirme anketi** (`STORE_COPY.md`'deki "Mature content"
   cevaplarını kullan).
5. **Mağaza sayfasını incelemeye gönder** — Valve 2-5 iş günü. Sayfa onaylanmadan "Coming Soon"
   bile görünmez; bunu build'den ÖNCE başlat, paralel yürür.

## Benim adımlarım (App ID gelince)

6. **Steam Cloud** — Steamworks → App Admin → Cloud. Kayıt yolları:
   - Windows: `%APPDATA%\FANCY OUTFITS\saves\*.json`
     (Steam'in "root": `WinAppDataRoaming`, alt yol `FANCY OUTFITS/saves`, desen `*.json`)
   - macOS: `~/Library/Application Support/FANCY OUTFITS/saves/*.json`
     (root `MacAppSupport`, aynı alt yol)
   - Kota: 3 slot × ~200 KB + ayarlar + başarımlar → **2 MB** bol bol yeter.
   - `launch-diagnostics.txt` Cloud'a **GİRMEZ** (makineye özgü, her açılışta yazılıyor).
7. **Depot yapılandırması** — iki depot: Windows (`release/win-unpacked/` içeriği) ve macOS
   (`release/mac-arm64/FANCY OUTFITS.app` + x64). Launch option: `FANCY OUTFITS.exe` / `.app`.
   Kurulum exe'si (NSIS) Steam'e yüklenmez — Steam kendi kurar; `win-unpacked` yüklenir.
8. **SteamPipe yükleme** — `steamcmd` + `app_build.vdf`/`depot_build.vdf`. Script'ini yazıp
   `scripts/steam-upload/` altına koyarım; ilk yükleme senin Steam hesabınla (Steam Guard).
9. **`steamworks.js`** — başarımlar (11 tane, `achievements.js` 1:1 hazır) + overlay.
   **KARAR (2026-09-15): ikinci güncelleme.** Gerekçe: yeni bir native runtime bağımlılığı
   (kırmızı çizgi) ve bu makinede Steam istemcisi olmadığı için gerçek Steam'e karşı test
   edilemiyor — yayından hemen önce test edilemeyen native kod eklenmez. Steam SDK'sız
   yayın mümkün. Zamanı gelince: App ID 480 ile geliştirme testi, gerçek App ID'de
   başarımların Steamworks panelinde tanımı (isim/ikon), `try/catch` ile guard'lı yükleme —
   Steam yokken oyun aynen çalışmalı.
10. **Build inceleme** — Valve build'i de inceler (genelde 1-3 gün). Yayın butonuna basmadan
    önce "release" branch'ine build set edilmiş olmalı.

## Bilinçli olarak yapılmayanlar

- **Kod imzası.** Windows exe imzasız (SmartScreen uyarır — Steam üzerinden açılınca Steam
  istemcisi başlattığı için sorun değil). macOS `.app` imzasız/notarize değil — Steam Mac
  oyuncuları Gatekeeper uyarısı görebilir; Developer ID sertifikası ($99/yıl) ayrı bir karar.
- **GPU donması.** Doğrulanmamış tek rapor; bugün ship edilen hal güvenli taraf (hızlandırma
  kapalı). `WINDOWS_TEST.md` protokolü duruyor, `FO_GPU=1` anahtarı içeride. Steam beta dalında
  ilk gerçek Windows oyuncusuyla kapatılır.

## Alternatif / ek: itch.io

Ücret yok, inceleme yok. `release/FANCY OUTFITS-<sürüm>-win.zip` ve mac zip'ini yükle,
`STORE_COPY.md` aynen kullanılır, görseller aynen. Steam'e para yatırmadan gerçek oyuncu
geri bildirimi almanın en ucuz yolu; iki platform birbirini dışlamaz.
