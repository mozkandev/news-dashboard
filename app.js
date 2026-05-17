/* ─── News Dashboard - App Logic ──────────────────── */
(function () {
  "use strict";

  const CATEGORY_LABELS = {
    teknoloji: { icon: "💻", name: "Teknoloji" },
    dunya: { icon: "🌍", name: "Dünya" },
    turkiye: { icon: "🇹🇷", name: "Türkiye" },
  };

  let allData = null;
  let activeFilter = "all";
  let searchQuery = "";

  const container = document.getElementById("news-container");
  const updateTime = document.getElementById("update-time");
  const totalCount = document.getElementById("total-count");

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
    } catch {
      return dateStr;
    }
  }

  function truncate(text, maxLen = 200) {
    if (!text || text.length <= maxLen) return text || "";
    return text.slice(0, maxLen).split(" ").slice(0, -1).join(" ") + "...";
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

      // Apply filter
      if (activeFilter !== "all" && activeFilter !== catKey) continue;

      // Apply search
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
              <a href="${escapeHtml(item.link || "#")}" class="news-link" target="_blank" rel="noopener">Oku →</a>
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

    // update time
    if (allData.updated_at) {
      updateTime.textContent = `🕐 Son güncelleme: ${formatDate(allData.updated_at)}`;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ─── Data Fetching ──────────────────────────────── */
  async function fetchNews() {
    container.innerHTML = `<div class="loading">Haberler yükleniyor...</div>`;

    // Try multiple paths for GitHub Pages compatibility
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
          return;
        }
      } catch (e) {
        continue;
      }
    }

    // All paths failed — try one last time with explicit GitHub raw
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
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    container.innerHTML = `
      <div class="error">
        <p>❌ Haberler yüklenemedi</p>
        <p class="error-detail">RSS beslemeleri şu anda ulaşılamıyor olabilir. GitHub Actions'ın çalıştığından emin ol.</p>
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

  /* ─── Auto-refresh ───────────────────────────────── */
  function startAutoRefresh() {
    // Refresh every 5 minutes
    setInterval(fetchNews, 5 * 60 * 1000);
  }

  /* ─── Init ───────────────────────────────────────── */
  function init() {
    setupFilters();
    fetchNews();
    startAutoRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
