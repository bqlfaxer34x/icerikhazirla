# Geri Baglanti Icerik Olusturucu

SEO geri baglantilariniz icin hazir icerik ureten yapay zeka destekli arac.

---

## Nasil Kullanilir?

### Adim 1: URL ve Anahtar Kelime Gir
```
https://example.com:anahtar kelime
```
- Once hedef URL'yi yaz
- Iki nokta (:) koy
- Sonra anchor text olacak kelimeyi yaz

**Ornek:** `https://mobilyaci.com:mobilya magazasi`

---

### Adim 2: Marka Adi Gir
Isletmenin veya markanin adini yaz.

**Ornek:** `Ahmet Mobilya`

---

### Adim 3: Isletme Tanimi
Iki secenek var:
- **Elle yaz:** Isletmeyi 2-3 cumle ile anlat
- **Otomatik:** "URL'den Olustur" butonuna tikla, yapay zeka siteyi okuyup tanim olusturur

---

### Adim 4: Ayarlari Sec

| Ayar | Ne Ise Yarar? |
|------|---------------|
| **Dil** | Icerik hangi dilde olsun? (Turkce, Ingilizce, vb.) |
| **Icerik Turu** | Nerede kullanacaksin? (Forum, Bio, Makale, Sosyal Medya) |
| **Kelime Sayisi** | Her icerik kac kelime olsun? (60-100-150-200-300) |
| **Toplam Adet** | Kac tane icerik uretilsin? (10 ile 100 arasi) |

---

### Adim 5: Icerik Olustur Butonuna Tikla
- Bekle, icerikler 10'ar 10'ar uretilecek
- Ilerleme cubugunu takip et

---

### Adim 6: Icerikleri Kullan

| Buton | Ne Yapar? |
|-------|-----------|
| **Kopyala** | Icerigi panoya kopyalar, yapistirabilirsin |
| **Sil** | Begenmediysen siler |
| **Word Indir** | Tum icerikleri .doc dosyasi olarak indirir |

---

## Ozellikler

- **Otomatik Link:** Anahtar kelime otomatik olarak tiklananabilir link olur
- **Coklu Grup:** Farkli URL:Kelime ciftleri icin ayri sekmeler olusur
- **Batch Isleme:** Cok sayida icerik 10'ar 10'ar uretilir (token limiti asmamak icin)
- **Ilerleme Takibi:** Kac icerik uretildi, kac kaldi gorebilirsin
- **Word Export:** Tum gruplari tek dosyada indir

---

## Icerik Turleri

| Tur | Nerede Kullanilir? |
|-----|-------------------|
| **Forum / Yorum** | Blog yorumlari, forum paylasimalri |
| **Profil / Bio** | Profil aciklamalari, hakkinda bolumleri |
| **Makale** | Blog yazilari, makaleler icin paragraflar |
| **Sosyal Medya** | Facebook, Twitter, LinkedIn paylasimlari |

---

## Kurulum

```bash
# Bagimliliklari yukle
npm install

# Gelistirme sunucusu (test icin)
npm run dev

# Production build
npm run build
npm start
```

Tarayicida ac: **http://localhost:3000**

---

## Teknolojiler

- Next.js 14
- React
- Tailwind CSS
- shadcn/ui
- DeepSeek API
