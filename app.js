/* ─── News Dashboard - App Logic ──────────────────── */
(function () {
  "use strict";

  const CATEGORY_LABELS = {
    teknoloji: { icon: "💻", name: "Teknoloji" },
    dunya: { icon: "🌍", name: "Dünya" },
    turkiye: { icon: "🇹🇷", name: "Türkiye" },
  };

  const FAVORITES_KEY = "news_dashboard_favorites";

  let allData = null;
  let activeFilter = "all";
  let searchQuery = "";
  let favorites = loadFavorites();

  const container = document.getElementById("news-container");
  const updateTime = document.getElementById("update-time");
  const totalCount = document.getElementById("total-count");
  const refreshBtn = document.getElementById("refresh-btn");
  const weatherText = document.getElementById("weather-text");
  const exchangeText = document.getElementById("exchange-text");
  const favoritesWidget = document.getElementById("favorites-widget");
  const favoritesPanel = document.getElementById("favorites-panel");
  const favoritesList = document.getElementById("favorites-list");
  const clearFavBtn = document.getElementById("clear-favorites-btn");

  /* ─── Utilities ──────────────────────────────────── */
  function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "az önce";
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} gün önce`;
    return date.toLocaleDateString("tr-TR");
  }

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("tr-TR", {
        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      });
    } catch { return dateStr; }
  }

  function truncate(text, maxLen = 200) {
    if (!text || text.length <= maxLen) return text || "";
    return text.slice(0, maxLen).split(" ").slice(0, -1).join(" ") + "...";
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getItemId(item) {
    return btoa(item.link || item.title).slice(0, 32);
  }

  /* ─── Favorites (localStorage) ────────────────────── */
  function loadFavorites() {
    try {
      const data = localStorage.getItem(FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  }

  function saveFavorites() {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch { /* ignore */ }
    updateFavoritesUI();
  }

  function isFavorite(item) {
    const id = getItemId(item);
    return favorites.some((f) => f.id === id);
  }

  function toggleFavorite(item) {
    const id = getItemId(item);
    const idx = favorites.findIndex((f) => f.id === id);
    if (idx >= 0) {
      favorites.splice(idx, 1);
    } else {
      favorites.unshift({
        id,
        title: item.title,
        link: item.link,
        source: item.source,
        savedAt: new Date().toISOString(),
      });
    }
    saveFavorites();
    render();
  }

  function removeFavorite(id) {
    favorites = favorites.filter((f) => f.id !== id);
    saveFavorites();
  }

  function clearFavorites() {
    favorites = [];
    saveFavorites();
    renderFavoritesPanel();
  }

  function updateFavoritesUI() {
    const count = favorites.length;
    favoritesWidget.classList.toggle("has-items", count > 0);
    const label = favoritesWidget.querySelector(".widget-label");
    label.textContent = count > 0 ? `🔖 ${count} kayıtlı` : "🔖 Kaydedilenler";

    // Close panel if no favorites
    if (count === 0 && !favoritesPanel.classList.contains("hidden")) {
      favoritesPanel.classList.add("hidden");
    }
  }

  function renderFavoritesPanel() {
    if (favorites.length === 0) {
      favoritesPanel.classList.add("hidden");
      return;
    }

    favoritesList.innerHTML = favorites
      .map(
        (fav) => `
          <div class="fav-item">
            <a href="${escapeHtml(fav.link)}" target="_blank" rel="noopener">
              ${escapeHtml(fav.title)}
            </a>
            <button class="fav-remove" data-fav-id="${escapeHtml(fav.id)}">✕</button>
          </div>
        `
      )
      .join("");

    // Attach remove handlers
    favoritesList.querySelectorAll(".fav-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        removeFavorite(e.target.dataset.favId);
        renderFavoritesPanel();
      });
    });

    favoritesPanel.classList.remove("hidden");
  }

  /* ─── Weather Widget ──────────────────────────────── */
  async function fetchWeather() {
    try {
      const resp = await fetch(
        "https://wttr.in/?format=%C|%t|%w|%h&lang=tr",
        { cache: "no-cache" }
      );
      if (!resp.ok) throw new Error("Weather failed");
      const text = await resp.text();
      const parts = text.split("|").map((s) => s.trim());
      const condition = parts[0] || "";
      const temp = parts[1] || "";
      const wind = parts[2] || "";
      const humidity = parts[3] || "";
      weatherText.textContent = `${condition} ${temp} Rüzgar: ${wind}  Nem: ${humidity}`;

      // Weather icons based on condition
      const iconMap = {
        sunny: "☀️", clear: "🌙", cloudy: "☁️", overcast: "☁️",
        rain: "🌧", "light rain": "🌦", "heavy rain": "🌧",
        snow: "❄️", fog: "🌫", mist: "🌫", thunder: "⛈",
        "patchy rain": "🌦",
      };
      const condLower = condition.toLowerCase();
      let icon = "🌤";
      for (const [key, emoji] of Object.entries(iconMap)) {
        if (condLower.includes(key)) { icon = emoji; break; }
      }
      const widgetIcon = weatherText.closest(".widget").querySelector(".widget-icon");
      if (widgetIcon) widgetIcon.textContent = icon;
    } catch {
      weatherText.textContent = "🌤 Hava durumu alınamadı";
    }
  }

  /* ─── Exchange Rate Widget ────────────────────────── */
  function renderExchange(data) {
    if (!data || !data.exchange_rates) {
      exchangeText.textContent = "💱 Döviz alınamadı";
      return;
    }
    const r = data.exchange_rates;
    let text = "";
    if (r.usd_try) text += `USD/TRY: ${r.usd_try.toLocaleString("tr-TR", { minimumFractionDigits: 4 })}`;
    if (r.eur_try) text += (text ? "  |  " : "") + `EUR/TRY: ${r.eur_try.toLocaleString("tr-TR", { minimumFractionDigits: 4 })}`;
    if (!text) text = "💱 Döviz alınamadı";
    exchangeText.textContent = text;
  }

  /* ─── Rendering ──────────────────────────────────── */
  function render() {
    if (!allData) {
      container.innerHTML = `<div class="loading">Haberler yükleniyor...</div>`;
      return;
    }

    let categories = allData.categories || {};
    let total = 0;
    let html = "";
    let hasAny = false;

    for (const [catKey, catInfo] of Object.entries(CATEGORY_LABELS)) {
      let items = categories[catKey] || [];
      if (activeFilter !== "all" && activeFilter !== catKey) continue;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(
          (item) =>
            (item.title || "").toLowerCase().includes(q) ||
            (item.description || "").toLowerCase().includes(q) ||
            (item.source || "").toLowerCase().includes(q)
        );
      }
      if (items.length === 0) continue;
      hasAny = true;
      total += items.length;

      html += `
        <div class="category-section category-${catKey}">
          <div class="category-header">
            <span class="category-dot"></span>
            <h2>${catInfo.icon} ${catInfo.name}</h2>
            <span class="category-count">${items.length}</span>
          </div>
          <div class="news-grid">
      `;

      for (const item of items) {
        const saved = isFavorite(item);
        html += `
          <div class="news-card">
            <div class="news-source">
              <span class="source-dot"></span>
              <span class="source-name">${escapeHtml(item.source || "")}</span>
            </div>
            <div class="news-title">
              <a href="${escapeHtml(item.link || "#")}" target="_blank" rel="noopener">
                ${escapeHtml(item.title || "Başlık yok")}
              </a>
            </div>
            <div class="news-desc">${escapeHtml(truncate(item.description || "", 250))}</div>
            <div class="news-meta">
              <span class="news-time">🕐 ${timeAgo(item.published)}</span>
              <span>
                <button class="bookmark-btn ${saved ? "saved" : ""}" data-news='${escapeHtml(JSON.stringify({ title: item.title, link: item.link, source: item.source }))}'>
                  ${saved ? "★" : "☆"}
                </button>
                <a href="${escapeHtml(item.link || "#")}" class="news-link" target="_blank" rel="noopener">Oku →</a>
              </span>
            </div>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    if (!hasAny) {
      html = `
        <div class="empty-state">
          <p>🔍 Sonuç bulunamadı</p>
          <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">
            Farklı bir arama terimi dene veya filtreyi sıfırla.
          </p>
        </div>
      `;
    }

    container.innerHTML = html;
    totalCount.textContent = `${total} haber`;

    if (allData.updated_at) {
      updateTime.textContent = `🕐 ${formatDate(allData.updated_at)}`;
      document.getElementById("footer-update").textContent = `son: ${formatDate(allData.updated_at)}`;
    }

    // Attach bookmark handlers
    container.querySelectorAll(".bookmark-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          const item = JSON.parse(btn.dataset.news);
          toggleFavorite(item);
        } catch { /* ignore */ }
      });
    });
  }

  /* ─── Data Fetching ──────────────────────────────── */
  async function fetchNews(showLoading = true) {
    if (showLoading) {
      container.innerHTML = `<div class="loading">Haberler yükleniyor...</div>`;
    }

    const paths = [
      "news.json",
      "./news.json",
      "/news-dashboard/news.json",
      "https://raw.githubusercontent.com/mozkandev/news-dashboard/main/news.json",
    ];

    for (const path of paths) {
      try {
        const resp = await fetch(path, { cache: "no-cache" });
        if (!resp.ok) continue;
        const data = await resp.json();
        if (data && data.categories) {
          allData = data;
          render();
          renderExchange(data);
          return;
        }
      } catch { continue; }
    }

    try {
      const resp = await fetch(
        "https://raw.githubusercontent.com/mozkandev/news-dashboard/main/news.json",
        { cache: "no-cache" }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.categories) {
          allData = data;
          render();
          renderExchange(data);
          return;
        }
      }
    } catch { /* ignore */ }

    container.innerHTML = `
      <div class="error">
        <p>❌ Haberler yüklenemedi</p>
        <p class="error-detail">GitHub Actions'ın çalıştığından emin ol. Sayfayı yenile veya tekrar dene.</p>
        <button class="retry-btn" onclick="window.location.reload()">Tekrar Dene</button>
      </div>
    `;
  }

  /* ─── Filters & Search ───────────────────────────── */
  function setupFilters() {
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        render();
      });
    });

    const searchInput = document.getElementById("search");
    let debounceTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        render();
      }, 300);
    });
  }

  /* ─── Refresh ────────────────────────────────────── */
  function setupRefresh() {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.classList.add("spinning");
      await fetchNews(false);
      refreshBtn.classList.remove("spinning");
    });
  }

  /* ─── Favorites Toggle ────────────────────────────── */
  function setupFavoritesToggle() {
    favoritesWidget.addEventListener("click", () => {
      if (favoritesPanel.classList.contains("hidden")) {
        renderFavoritesPanel();
      } else {
        favoritesPanel.classList.add("hidden");
      }
    });

    clearFavBtn.addEventListener("click", clearFavorites);
  }

  /* ─── Auto-refresh ───────────────────────────────── */
  function startAutoRefresh() {
    setInterval(() => fetchNews(false), 5 * 60 * 1000);
  }

  /* ─── Init ───────────────────────────────────────── */
  function init() {
    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }

    setupFilters();
    setupRefresh();
    setupFavoritesToggle();
    fetchNews();
    fetchWeather();
    updateFavoritesUI();
    startAutoRefresh();

    // Refresh weather every 30 min
    setInterval(fetchWeather, 30 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
