# 📰 News Dashboard

RSS beslemelerinden haberleri çeken, kategorilere ayıran ve tek bir dashboard'da gösteren GitHub Pages sitesi.

**Canlı:** https://mozkandev.github.io/news-dashboard/

## 🚀 Özellikler

- **3 Kategori:** Teknoloji 💻 | Dünya 🌍 | Türkiye 🇹🇷
- **10+ RSS Kaynağı:** HackerNews, TechCrunch, The Verge, Webtekno, ShiftDelete, BBC, Guardian, NPR, Sözcü, NTV
- **Otomatik Güncelleme:** GitHub Actions ile her 30 dakikada bir taze haber
- **Karanlık Tema:** Göz yormayan arayüz
- **Filtreleme:** Kategoriye göre filtre, metin araması
- **Mobil Uyumlu:** Responsive tasarım
- **Sıfır Bağımlılık:** Python script'i sadece standart kütüphane kullanır

## 🛠️ Kullanılan Teknolojiler

- **Python 3** — RSS besleme çekici (sıfır bağımlılık)
- **GitHub Actions** — Zamanlanmış haber güncellemeleri
- **GitHub Pages** — Statik hosting
- **Vanilla JS** — Hiçbir framework yok, sade düz JS + CSS

## 📂 Proje Yapısı

```
├── .github/workflows/
│   └── fetch-news.yml    # GitHub Actions: 30dk'da bir çalışır
├── scripts/
│   └── fetch_news.py     # RSS çekici Python script
├── index.html            # Dashboard ana sayfa
├── style.css             # Stiller (dark tema)
├── app.js                # Dashboard mantığı
├── news.json             # Script tarafından üretilen veri
└── README.md
```

## 🔧 Geliştirme

```bash
# Haberleri manuel çekmek için
python3 scripts/fetch_news.py
```

## 📄 Lisans

MIT
