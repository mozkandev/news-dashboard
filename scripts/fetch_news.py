#!/usr/bin/env python3
"""
News Dashboard - RSS Feed Fetcher
Fetches news from RSS feeds, outputs JSON for the static dashboard.
Zero external dependencies - uses only Python stdlib.
"""

import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html import unescape
import re
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "news.json")
MAX_ITEMS_PER_FEED = 10
REQUEST_TIMEOUT = 15
USER_AGENT = "Mozilla/5.0 (compatible; NewsDashboard/1.0)"

# ─── RSS Feed Sources ────────────────────────────────────────────────
FEEDS = {
    "teknoloji": [
        {"name": "HackerNews", "url": "https://hnrss.org/frontpage"},
        {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
        {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml"},
        {"name": "Webtekno", "url": "https://www.webtekno.com/rss.xml"},
        {"name": "ShiftDelete", "url": "https://shiftdelete.net/feed"},
    ],
    "dunya": [
        {"name": "BBC News", "url": "https://feeds.bbci.co.uk/news/rss.xml"},
        {"name": "The Guardian", "url": "https://www.theguardian.com/world/rss"},
        {"name": "NPR", "url": "https://feeds.npr.org/1001/rss.xml"},
    ],
    "turkiye": [
        {"name": "BBC Turkish", "url": "https://www.bbc.com/turkce/index.xml"},
        {"name": "Sözcü", "url": "https://www.sozcu.com.tr/rss/"},
        {"name": "NTV", "url": "https://www.ntv.com.tr/gundem.rss"},
    ],
}

# Fallback scraping for sites without proper RSS
FALLBACK_SCRAPES = {
}

def clean_html(text):
    """Strip HTML tags and unescape entities."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return unescape(text).strip()

def truncate(text, max_len=200):
    """Truncate text to max_len chars, adding ellipsis."""
    if not text:
        return ""
    if len(text) > max_len:
        return text[:max_len].rsplit(" ", 1)[0] + "..."
    return text

def parse_date(date_str):
    """Parse various date formats to ISO format string."""
    if not date_str:
        return datetime.now(timezone.utc).isoformat()

    # Try common RSS date formats
    from email.utils import parsedate_to_datetime
    try:
        dt = parsedate_to_datetime(date_str)
        return dt.isoformat()
    except (ValueError, TypeError):
        pass

    # Try ISO format
    try:
        from datetime import datetime as dt_parse
        return dt_parse.fromisoformat(date_str.replace("Z", "+00:00")).isoformat()
    except (ValueError, TypeError):
        pass

    return datetime.now(timezone.utc).isoformat()

def fetch_url(url):
    """Fetch URL content with timeout and user-agent."""
    req = Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            return resp.read()
    except (URLError, HTTPError, TimeoutError, OSError) as e:
        print(f"  [!] Failed to fetch {url}: {e}")
        return None

def parse_rss_feed(source_name, feed_url):
    """Parse an RSS/Atom feed and return list of news items."""
    print(f"  -> Fetching: {source_name} ({feed_url})")
    data = fetch_url(feed_url)
    if not data:
        return []

    items = []
    try:
        root = ET.fromstring(data)
    except ET.ParseError as e:
        print(f"  [!] XML parse error for {source_name}: {e}")
        return []

    # Determine if RSS 2.0 or Atom
    ns = {"": ""}
    item_tag = "item"
    title_tag = "title"
    link_tag = "link"
    desc_tag = "description"
    date_tag = "pubDate"

    # Check for Atom format
    atom_ns = None
    if root.tag == "{http://www.w3.org/2005/Atom}feed":
        atom_ns = "{http://www.w3.org/2005/Atom}"
        item_tag = f"{atom_ns}entry"
        title_tag = f"{atom_ns}title"
        link_tag = f"{atom_ns}link"
        desc_tag = f"{atom_ns}summary"
        date_tag = f"{atom_ns}updated"
    elif root.tag == "feed":
        # Possibly Atom without namespace
        entries = root.findall("entry")
        if entries:
            item_tag = "entry"
            title_tag = "title"
            link_tag = "link"
            desc_tag = "summary"
            date_tag = "updated"

    channel = root.find("channel")
    entries = root.findall(f".//{item_tag}")

    if not entries and channel is not None:
        entries = channel.findall(item_tag)

    for entry in entries[:MAX_ITEMS_PER_FEED]:
        # Title
        title_el = entry.find(title_tag)
        if title_el is None:
            continue
        title = clean_html(title_el.text or title_el.text or "")

        # Link
        link = ""
        if atom_ns:
            link_el = entry.find(f"{atom_ns}link")
            if link_el is not None:
                link = link_el.get("href", "")
        else:
            link_el = entry.find(link_tag)
            if link_el is not None:
                # Could be <link>text</link> or <link href="..."/>
                link = link_el.text or link_el.get("href", "")
                if not link and link_el.text:
                    link = link_el.text

        # Description / Summary
        desc_el = entry.find(desc_tag)
        description = clean_html(desc_el.text or "") if desc_el is not None else ""

        # Date
        date_el = entry.find(date_tag)
        date_str = date_el.text.strip() if date_el is not None and date_el.text else ""
        published = parse_date(date_str)

        if title and link:
            items.append({
                "title": title,
                "link": link,
                "description": truncate(description, 250),
                "source": source_name,
                "published": published,
            })

    print(f"    ✓ {len(items)} haber bulundu")
    return items

def scrape_fallback(source_name, scrape_config):
    """Fallback scraper for sites that block RSS."""
    print(f"  -> Scraping: {source_name}")
    # Placeholder for future scraping logic
    print(f"    ✗ Scraping not implemented yet for {source_name}")
    return []

def main():
    print("=" * 60)
    print("  News Dashboard - RSS Fetcher")
    print(f"  Started: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    all_news = {"teknoloji": [], "dunya": [], "turkiye": []}

    for category, feeds in FEEDS.items():
        print(f"\n─── {category.upper()} ───")
        for feed in feeds:
            items = parse_rss_feed(feed["name"], feed["url"])
            all_news[category].extend(items)

    # Fallback scrapes
    for category, sources in FALLBACK_SCRAPES.items():
        print(f"\n─── {category.upper()} (FALLBACK) ───")
        for source_name, config in sources.items():
            items = scrape_fallback(source_name, config)
            if category not in all_news:
                all_news[category] = []
            all_news[category].extend(items)

    # Sort by date (newest first) within each category
    for category in all_news:
        all_news[category].sort(
            key=lambda x: x.get("published", ""),
            reverse=True
        )

    # Summary stats
    total = sum(len(items) for items in all_news.values())
    print(f"\n{'=' * 60}")
    print(f"  Toplam: {total} haber")
    for cat, items in all_news.items():
        print(f"    {cat}: {len(items)} haber")

    # Fetch exchange rates
    print(f"\n─── DÖVİZ KURLARI ───")
    exchange_rates = fetch_exchange_rates()

    # Write output
    output = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "categories": all_news,
        "exchange_rates": exchange_rates,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n  ✓ Kaydedildi: {OUTPUT_FILE}")
    print("=" * 60)

def fetch_exchange_rates():
    """Fetch USD/TRY and EUR/TRY exchange rates."""
    rates = {"usd_try": None, "eur_try": None, "eur_usd": None}
    try:
        data = fetch_url("https://open.er-api.com/v6/latest/USD")
        if data:
            parsed = json.loads(data)
            if parsed.get("result") == "success":
                rates["eur_usd"] = round(parsed["rates"].get("EUR", 0), 4)
                rates["usd_try"] = round(parsed["rates"].get("TRY", 0), 4)
                print(f"  ✓ USD/TRY: {rates['usd_try']} | EUR/USD: {rates['eur_usd']}")

        data = fetch_url("https://open.er-api.com/v6/latest/EUR")
        if data:
            parsed = json.loads(data)
            if parsed.get("result") == "success":
                rates["eur_try"] = round(parsed["rates"].get("TRY", 0), 4)
                print(f"  ✓ EUR/TRY: {rates['eur_try']}")
    except Exception as e:
        print(f"  [!] Döviz kuru hatası: {e}")

    # Also try alternative API as fallback
    if not all(rates.values()):
        try:
            data = fetch_url("https://api.exchangerate-api.com/v4/latest/USD")
            if data:
                parsed = json.loads(data)
                if parsed.get("result") == "success" or "rates" in parsed:
                    rates["eur_usd"] = round(parsed["rates"].get("EUR", 0), 4)
                    rates["usd_try"] = round(parsed["rates"].get("TRY", 0), 4)
                    print(f"  ✓ (fallback) USD/TRY: {rates['usd_try']}")
                    if "EUR" in parsed.get("rates", {}):
                        rates["eur_try"] = round(parsed["rates"]["TRY"] / parsed["rates"]["EUR"], 4)
        except Exception:
            pass

    return rates

if __name__ == "__main__":
    main()
