// static/js/script.js

document.addEventListener('DOMContentLoaded', function () {
    initializeDates();
    setHeaderDate();

    // Allow pressing Enter in search box to fetch
    document.getElementById('searchQuery').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            fetchNews();
        }
    });
});

/**
 * Set default date values (yesterday → today)
 */
function initializeDates() {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    document.getElementById('fromDate').value = formatDateInput(yesterday);
    document.getElementById('toDate').value = formatDateInput(today);

    // Set max date to today
    document.getElementById('fromDate').max = formatDateInput(today);
    document.getElementById('toDate').max = formatDateInput(today);
}

/**
 * Format date for input[type=date] → YYYY-MM-DD
 */
function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Set current date in header and footer
 */
function setHeaderDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    document.getElementById('currentDate').textContent = dateStr;
    document.getElementById('footerDate').textContent = dateStr;
}

/**
 * Quick search from tag buttons
 */
function quickSearch(topic) {
    document.getElementById('searchQuery').value = topic;
    fetchNews();
}

/**
 * Main fetch function
 */
async function fetchNews() {
    const query = document.getElementById('searchQuery').value.trim();
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;

    // Validation
    if (!query) {
        showStatus('Please enter a search query.');
        document.getElementById('searchQuery').focus();
        return;
    }

    if (fromDate && toDate && fromDate > toDate) {
        showStatus('The "From" date cannot be after the "To" date.');
        return;
    }

    // UI state: loading
    hideAllStates();
    showLoading(true);
    setButtonLoading(true);

    try {
        const params = new URLSearchParams({
            q: query,
            from_date: fromDate,
            to_date: toDate
        });

        const response = await fetch(`/api/news?${params.toString()}`);
        const data = await response.json();

        showLoading(false);
        setButtonLoading(false);

        if (data.success) {
            if (data.articles && data.articles.length > 0) {
                renderNews(data);
            } else {
                showNoResults();
            }
        } else {
            showError('News Fetch Failed', data.message || 'An unknown error occurred.');
        }
    } catch (error) {
        showLoading(false);
        setButtonLoading(false);
        showError('Connection Error', 'Could not connect to the server. Please check your connection and try again.');
        console.error('Fetch error:', error);
    }
}

/**
 * Render news articles onto the page
 */
function renderNews(data) {
    const container = document.getElementById('newsContainer');
    const heroSection = document.getElementById('heroArticle');
    const heroRule = document.getElementById('heroRule');
    const grid = document.getElementById('articlesGrid');
    const summary = document.getElementById('resultsSummary');

    // Results summary
    summary.innerHTML = `Showing <strong>${data.articles.length}</strong> articles for "<strong>${escapeHtml(data.query)}</strong>" &mdash; ${data.from_date} to ${data.to_date}`;

    const articles = data.articles;

    // HERO: first article
    const hero = articles[0];
    heroSection.innerHTML = `
        <div class="hero-image-wrapper">
            ${hero.image
            ? `<img src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.title)}" onerror="this.parentElement.innerHTML='<div class=\\'hero-image-placeholder\\'>📰</div>'">`
            : '<div class="hero-image-placeholder">📰</div>'
        }
        </div>
        <div class="hero-content">
            <div class="hero-source">${escapeHtml(hero.source)}</div>
            <h2 class="hero-headline">
                <a href="${escapeHtml(hero.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(hero.title)}</a>
            </h2>
            <p class="hero-description">${escapeHtml(hero.description)}</p>
            <div class="hero-date">${escapeHtml(hero.publishedFormatted)}</div>
            <a href="${escapeHtml(hero.url)}" target="_blank" rel="noopener noreferrer" class="hero-link">Read Full Story →</a>
        </div>
    `;
    heroSection.style.display = 'grid';
    heroRule.style.display = 'block';

    // GRID: remaining articles
    grid.innerHTML = '';
    if (articles.length > 1) {
        for (let i = 1; i < articles.length; i++) {
            const article = articles[i];
            const card = document.createElement('article');
            card.className = 'article-card';
            card.innerHTML = `
                <div class="article-image-wrapper">
                    ${article.image
                    ? `<img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'article-image-placeholder\\'>📰</div>'">`
                    : '<div class="article-image-placeholder">📰</div>'
                }
                </div>
                <div class="article-source">${escapeHtml(article.source)}</div>
                <h3 class="article-headline">
                    <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title)}</a>
                </h3>
                <p class="article-description">${escapeHtml(article.description)}</p>
                <div class="article-meta">${escapeHtml(article.publishedFormatted)}</div>
                <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="article-read-more">Read More →</a>
            `;
            card.style.animationDelay = `${Math.min(i - 1, 8) * 55}ms`;
            grid.appendChild(card);
        }
    }

    container.style.display = 'block';

    // Smooth scroll to results
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ========== UI State Helpers ========== */

function hideAllStates() {
    document.getElementById('defaultPlaceholder').style.display = 'none';
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('newsContainer').style.display = 'none';
    document.getElementById('statusBar').style.display = 'none';
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'block' : 'none';
}

function setButtonLoading(loading) {
    const btn = document.getElementById('searchBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        btn.disabled = true;
        btn.style.opacity = '0.7';
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

function showError(title, message) {
    hideAllStates();
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').style.display = 'block';
}

function showNoResults() {
    hideAllStates();
    document.getElementById('noResults').style.display = 'block';
}

function showStatus(message) {
    const bar = document.getElementById('statusBar');
    document.getElementById('statusMessage').textContent = message;
    bar.style.display = 'block';
    setTimeout(() => {
        bar.style.display = 'none';
    }, 4000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

/* ============================================================
   NEWZY — INTERACTION LAYER
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    const date = new Date();
    const todayLabel = document.getElementById('todayLabel');
    if (todayLabel) {
        todayLabel.textContent = date.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        }).toUpperCase();
    }

    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('newzy-theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');

    themeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem(
            'newzy-theme',
            document.body.classList.contains('dark-mode') ? 'dark' : 'light'
        );
        showNewzyToast(
            document.body.classList.contains('dark-mode')
                ? 'NIGHT EDITION ON'
                : 'DAY EDITION ON'
        );
    });

    document.getElementById('printEdition')?.addEventListener('click', () => {
        window.print();
    });

    document.getElementById('backToTop')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

function showNewzyToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.newzyToastTimer);
    window.newzyToastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}


/* ============================================================
   NEWZY — OFF-CANVAS NEWS TOOLS
   ============================================================ */

(function initNewzyTools() {
    function setup() {
        const trigger = document.getElementById('newsToolsTrigger');
        const panel = document.getElementById('newsToolsPanel');
        const backdrop = document.getElementById('newsToolsBackdrop');
        const closeBtn = document.getElementById('closeNewsTools');
        const from = document.getElementById('fromDate');
        const to = document.getElementById('toDate');
        const label = document.getElementById('dateRangeLabel');

        if (!trigger || !panel) return;

        function pad(n) { return String(n).padStart(2, '0'); }

        function toInputDate(date) {
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        }

        function prettyDate(value) {
            if (!value) return '—';
            const date = new Date(`${value}T00:00:00`);
            return date.toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            }).toUpperCase();
        }

        function updateDateLabel() {
            if (!from?.value || !to?.value) {
                if (label) label.textContent = 'CHOOSE DATES';
                return;
            }
            if (label) label.textContent = `${prettyDate(from.value)} → ${prettyDate(to.value)}`;
        }

        function setDefaultRange() {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            if (from) from.value = toInputDate(yesterday);
            if (to) to.value = toInputDate(today);
            if (from) from.max = toInputDate(today);
            if (to) to.max = toInputDate(today);
            updateDateLabel();
        }

        function openTools() {
            panel.hidden = false;
            backdrop.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            document.body.classList.add('tools-open');
            setTimeout(() => document.getElementById('searchQuery')?.focus(), 30);
        }

        function closeTools() {
            panel.hidden = true;
            backdrop.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('tools-open');
        }

        trigger.addEventListener('click', () => {
            if (panel.hidden) openTools();
            else closeTools();
        });

        closeBtn?.addEventListener('click', closeTools);
        backdrop?.addEventListener('click', closeTools);

        from?.addEventListener('change', () => {
            if (to.value && from.value > to.value) to.value = from.value;
            updateDateLabel();
        });

        to?.addEventListener('change', () => {
            if (from.value && to.value < from.value) from.value = to.value;
            updateDateLabel();
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !panel.hidden) closeTools();
        });

        // Preserve the requested default: yesterday -> today.
        setDefaultRange();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
})();
