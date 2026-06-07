# SnipHive VS Code Code Review

Tarih: 2026-06-07

## Bulgular

### P1 - Sifreli snippet/note olusturma akisi buyuk olasilikla calismiyor

`src/crypto/E2EEService.ts:249` icinde `encryptContent()` once private key'i aliyor, sonra `src/crypto/E2EEService.ts:254-255` ile private JWK'den public key import etmeye calisiyor. Private JWK'nin `key_ops` degeri decrypt tarafina ait olacagi icin WebCrypto import'u bu usage ile kirilabilir. Kirilirsa `src/views/webviews.ts:162` ve `src/views/webviews.ts:216` uzerinden "Encrypt" secili create islemleri sadece "Encryption failed" doner.

Mevcut testler de gercek `E2EEService.encryptContent()` yolunu kapsamiyor.

### P1 - Recovery code kurulumu kontrati karsilanmiyor

OpenSpec basarili kurulumda recovery code gosterilmesini sart kosuyor: `openspec/changes/vscode-sniphive-plugin/specs/e2ee-encryption/spec.md:17`. Fakat `src/crypto/E2EEService.ts:162` recovery private key'i yine master password ile turetiyor; ayri recovery code uretmiyor.

`src/crypto/E2EEService.ts:190` sadece `{ success: true }` dondugu icin `src/views/webviews.ts:258` icindeki "Save your recovery codes" mesaji fiilen bos bir vaat.

### P1 - Test runner calismiyor, mevcut test suite guven vermiyor

`npm test` su hata ile kirildi:

```text
Cannot find module 'vscode'
```

Sebep `src/test/runTest.ts:1` icinde `vscode` modulunun normal Node surecinde import edilmesi; bu runner `@vscode/test-electron` ile extension host baslatmiyor. Ayrica `src/test/services/SnipHiveApiClient.test.ts:16` dis network'e (`jsonplaceholder`) bagimli, `src/test/services/AuthService.test.ts:3` ise gercek AuthService davranisi yerine sabit stringleri test ediyor.

### P1 - Workspace izolasyonu tutarsiz

Spec tum subsequent API isteklerinde `X-Workspace-Id` header'ini sart kosuyor: `openspec/changes/vscode-sniphive-plugin/specs/workspace-management/spec.md:14`. Fakat paginated fetch `src/services/SnipHiveApiClient.ts:96` ile workspace'i query param'a ekliyor, `src/services/SnipHiveApiClient.ts:105` ise header builder'a workspace vermiyor.

`getSnippets`, `getNotes`, `getTags`, `getGistImports` bu yoldan gectigi icin backend header'a guveniyorsa yanlis workspace datası veya bos liste donebilir.

### P2 - Workspace switching/persist ozelligi tamamlanmis gorunmuyor

README workspace switching vaat ediyor: `README.md:16`, spec selector ve settings persist istiyor: `openspec/changes/vscode-sniphive-plugin/specs/workspace-management/spec.md:21`. Kodda login sadece ilk workspace'i `globalState` icine yaziyor: `src/services/SnipHiveAuthService.ts:50`.

`sniphive.defaultWorkspace` okunuyor ama secim/restore akisinda kullanilmiyor: `src/config/settings.ts:14`.

### P2 - Webview HTML/JS interpolation alanlarinda XSS/markup injection riski var

Icerik bazi yerlerde escape ediliyor, fakat baslik ve tag alanlari dogrudan HTML'e giriyor:

- `src/views/panels.ts:25`
- `src/views/panels.ts:28`
- `src/views/panels.ts:141`
- `src/views/panels.ts:144`

Slug da nonce'lu script icine tek tirnakla gomuluyor:

- `src/views/panels.ts:51`
- `src/views/panels.ts:165`

Server kaynakli veya kullanici kontrollu title/tag/slug degerleri burada webview script/DOM davranisini bozabilir.

### P2 - Keybinding kontrati ve README ile manifest ayrismis

Spec default keybinding istiyor: `openspec/changes/vscode-sniphive-plugin/specs/extension-core/spec.md:14`, README de ayni kisayollari anlatiyor: `README.md:67`. Ancak mevcut `package.json:30` katkilarinda `keybindings` bolumu yok; dirty diff'te de keybindings'in kaldirildigi gorunuyor.

### P3 - Completion provider her dosya ve her completion cagrisinda tum snippet'leri isliyor

Provider global pattern ile kayitli: `src/extension.ts:51`. `src/providers/SnippetCompletionProvider.ts:83` tum cache'i dolasiyor ve encrypted snippet'lerde `src/providers/SnippetCompletionProvider.ts:98` decrypt deniyor.

Snippet sayisi arttiginda typing/completion latency yaratir.

## Dogrulama

`npm run compile` basarili gecti.

`npm test` calismadi; runner `vscode` modulunu extension host disinda import ettigi icin basta kiriliyor.

## Worktree Notu

Review baslangicinda worktree zaten kirliydi. Mevcut degisiklikler:

- `package.json`
- `src/commands/index.ts`
- `src/views/webviews.ts`

Bu rapor eklenirken bu dosyalara dokunulmadi.
