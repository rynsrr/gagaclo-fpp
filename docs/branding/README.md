# Font logo Gagaclo

Font asli: [`GagacloLogo-Regular.ttf`](../../public/fonts/GagacloLogo-Regular.ttf).
Referensi tampilan: [`gagaclo-logo-reference.png`](gagaclo-logo-reference.png).

Font tersedia melalui URL `/fonts/GagacloLogo-Regular.ttf` pada website.
Contoh penggunaan untuk membuat logo dengan tulisan `PT. GAGACLO`:

```css
@font-face {
  font-family: 'GagacloLogo';
  src: url('/fonts/GagacloLogo-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

.gagaclo-logo {
  font-family: 'GagacloLogo', sans-serif;
  font-weight: 400;
  font-style: normal;
}
```

```html
<span class="gagaclo-logo" role="img" aria-label="PT. Gagaclo">PT. GAGACLO</span>
```

Aset ini disimpan untuk penggunaan logo berikutnya. Logo yang saat ini tampil di aplikasi belum diganti.
