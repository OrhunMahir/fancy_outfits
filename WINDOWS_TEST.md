# Windows doğrulama protokolü

Bu dosya bir Windows makinesinde çalışan ajan (veya insan) içindir. Amaç tek bir soruyu
cevaplamak:

> Oyun Windows'ta donuyor mu, ve `disableHardwareAcceleration()` workaround'una hâlâ
> ihtiyacımız var mı?

## Neden bu dosya var

v1.9.3'te Windows'ta "donup kalıyor" diye **tek ve doğrulanmamış** bir rapor üzerine üç
değişiklik yapıldı: `app.disableHardwareAcceleration()`, açılışta `fullscreen:true` yerine
`maximize()`, ve `show:false` + `ready-to-show`. Hiçbiri gerçek bir Windows makinesinde test
edilmedi. Semptom hiç görülmedi, dolayısıyla düzeltilip düzeltilmediği de bilinmiyor.

Raporun geldiği sürüm bugünkü sürüm de değildi — o tarihte paketlenmiş bir build yoktu.

**En olası sonuç "hiçbir şey donmuyor" ve bu bir başarısızlık değil, bir keşiftir:** o zaman
workaround'un gereksiz olduğunu öğrenir ve kaldırırız. Şu an tüm oyuncular, doğrulanmamış bir
rapor yüzünden yazılımsal render'a mahkûm.

## ZORUNLU ŞART — WSL DEĞİL

Bu test **yerel Windows'ta** koşmalı. WSL'de gerçek Windows GPU sürücüsü/pencere yolu yoktur;
oradaki bir sonuç, testin tek amacı olan şeyi ölçmez. WSL'deysen dur ve söyle.

## Kurulum

Node ≥22.12 ve git gerekiyor.

```
git clone <repo> && cd fancy-outfits && npm ci
```

`npm install` değil `npm ci` — lock dosyasına birebir uyar.

## Testler

Her Electron koşusundan sonra `%APPDATA%\FANCY OUTFITS\launch-diagnostics.txt` dosyasını
**kopyala** — her açılışta üzerine yazılıyor, kopyalamazsan önceki koşunun kanıtı gider.

### A — Derleme ve regresyon

```
npm run build
npm test
```

İkisi de geçmeli. `npm test`; save şeması, migration'lar, board bütünlüğü, paketleme ayarları
ve çevrimdışı çalışmayı da doğrular.

### B — Electron, GPU kapalı (bugün ship edilen hal)

```
npm start
```

Beklenen: pencere açılır, **çizer** (logo + başlık ekranı görünür), oynanabilir.

Kontrol et:
- Pencere ~10 sn içinde göründü ve içerik boyandı mı? Yoksa beyaz/siyah kare mi?
- Boyanmadıysa süreç hâlâ çalışıyor mu? (**donmuş** ≠ **çökmüş**, ikisi çok farklı hata)
- `launch-diagnostics.txt` içinde `FO_GPU: unset (hardware acceleration OFF)` yazmalı.

### C — Electron, GPU açık

```powershell
$env:FO_GPU=1; npm start
```

Doğrulama: başlık çubuğunda **`FANCY OUTFITS — GPU ON (test build)`** yazmalı. Yazmıyorsa env
değişkeni uygulamaya ulaşmamıştır, o koşu geçersizdir. `launch-diagnostics.txt` de
`FO_GPU: 1` ve gerçek bir `gpu compositing:` değeri göstermeli.

> **Tuzak:** `$env:FO_GPU` o PowerShell oturumunda kalıcıdır. B'yi tekrar koşacaksan yeni bir
> pencere aç ya da `Remove-Item Env:FO_GPU`.

B ve C'yi **ikişer üçer kez**, aralarda uygulamayı tamamen kapatarak tekrarla.

### D — Kayıt devamlılığı

Bir kariyer başlat, birkaç dosya çöz, uygulamayı kapat, tekrar aç.

- `%APPDATA%\FANCY OUTFITS\saves\` altında `.json` dosyaları oluştu mu?
- Başlık ekranında **CONTINUE SLOT 1** çıkıyor mu?

### E — Paketleme (isteğe bağlı, en son)

```
npm run dist:win
```

`release\FANCY OUTFITS Setup <sürüm>.exe` kurulumunu dene. **SmartScreen uyarısı beklenen** —
exe imzasız ("Daha fazla bilgi → Yine de çalıştır"). Kurulan sürüm de açılıyor mu?

## Kanıt toplama (ajan için)

Gözle bakmak yerine ölçebileceğin üç yol var:

**1. Renderer gerçekten boyadı mı** — Electron'u uzaktan hata ayıklamayla başlat:

```
set VITE_DEV_SERVER_URL=
npx electron . --remote-debugging-port=9222
```

Sonra `http://127.0.0.1:9222/json/list` isteği sayfa hedefini ve başlığını verir. Hedef varsa
renderer yüklendi demektir. Aynı endpoint'teki `webSocketDebuggerUrl` üzerinden
`Runtime.evaluate` ile sayfanın içini sorgulayabilirsin — Node 22'de global `WebSocket` var,
ek paket gerekmez. Faydalı ifadeler:

```js
!!window.foStore                                     // dosya deposu köprüsü
document.fonts.check('10px "Press Start 2P"')        // gömülü font yüklendi mi
performance.getEntriesByType('resource')
  .filter(r => /^https?:/.test(r.name)).length       // 0 olmalı — çevrimdışı çalışmalı
document.querySelector('h2')?.textContent            // başlık ekranı çizildi mi
```

**2. Kare zamanlaması** — `requestAnimationFrame` deltalarını topla. Ölçmeden önce
`Page.bringToFront` gönder: arka plandaki pencerede rAF durur ve ölçüm anlamsız çıkar.
macOS'ta ölçüldüğünde GPU açık/kapalı medyan ve p95 aynıydı (8.3 / 9.3 ms); Windows'ta fark
çıkarsa bu önemli bir bulgudur.

**3. Ekran görüntüsü** — donma görseldir; PowerShell ile yakalanabilir:

```powershell
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$b = New-Object Drawing.Bitmap ([Windows.Forms.Screen]::PrimaryScreen.Bounds.Width),
                               ([Windows.Forms.Screen]::PrimaryScreen.Bounds.Height)
$g = [Drawing.Graphics]::FromImage($b)
$g.CopyFromScreen(0,0,0,0,$b.Size)
$b.Save("$env:TEMP\fo-shot.png")
```

## Rapor et

- Her koşunun `launch-diagnostics.txt` içeriği (B ve C ayrı ayrı)
- Donma oldu mu; olduysa **hangi koşuda ve tam olarak ne yaparken**
- `npm run build` ve `npm test` sonuçları
- Kayıt devamlılığı çalıştı mı
- Ölçtüysen kare zamanlaması sayıları
- Windows sürümü ve ekran kartı

## Yapma

- **Commit/push etme.** Sonuçları raporla; kod değişikliği ayrı bir karardır.
- Denge sabitlerine dokunma.
- `AGENTS.md` ve `DEV_LOGBOOK.md`'yi oku, ama bu turda logbook'a yazma — sonuçlar
  değerlendirildikten sonra tek kayıt olarak girecek.
