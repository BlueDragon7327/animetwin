const API = '/api/proxy';

function fixImg(url) {
    if (!url) return '';
    if (url.startsWith('https://') || url.startsWith('http://')) return url;
    return `https://anipub.xyz/${url.replace(/^\//, '')}`;
}

function getSubDub() {
    const v = localStorage.getItem('subdub');
    if (v === 'sub' || v === 'dub') return v;
    localStorage.setItem('subdub', 'sub');
    return 'sub';
}

function replaceSubDub(url, val) {
    if (!url) return url;
    let r = url.replace(/\/(sub|dub)(\/?)$/, '/' + val + '$2');
    r = r.replace(/type=(sub|dub)(&|$)/, 'type=' + val + '$2');
    return r;
}

function setSubDub(val) {
    if (val !== 'sub' && val !== 'dub') return;
    localStorage.setItem('subdub', val);
    document.querySelectorAll('.sub-dub-toggle button').forEach(b => {
        b.classList.toggle('active', b.dataset.sd === val);
    });
    const iframe = document.querySelector('.watch-player-wrap iframe');
    if (iframe) {
        const nxt = replaceSubDub(iframe.src, val);
        if (nxt !== iframe.src) iframe.src = nxt;
    }
}

function cardHTML(item, rank) {
    const img = fixImg(item.ImagePath || item.Image || item.poster || '');
    const name = item.Name || item.name || 'Unknown';
    const score = item.MALScore || item.score || '';
    const id = item._id || item.Id || item.id || '';
    const finder = item.finder || '';
    const linkId = id || finder;
    const epCount = item.epCount || '';
    const rankBadge = rank ? `<div class="card-rank">#${rank}</div>` : '';
    const scoreBadge = score ? `<div class="card-score">★ ${score}</div>` : '';
    const epBadge = epCount ? `<div class="card-ep-overlay">${epCount} EP</div>` : '';
    return `
    <div class="anime-card" onclick="gotoDetails('${linkId}')">
        <div class="card-img-wrap">
            <img class="card-img" src="${img}" alt="${name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 280%22><rect fill=%22%2312121a%22 width=%22200%22 height=%22280%22/><text fill=%22%23666%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>No Image</text></svg>'">
            <div class="card-gradient"></div>
            ${rankBadge}${scoreBadge}${epBadge}
            <div class="card-play"><div class="play-circle">&#9654;</div></div>
        </div>
        <div class="card-body">
            <div class="card-title">${name}</div>
            <div class="card-sub">${item.Genres ? item.Genres.slice(0, 2).join(', ') : ''}</div>
        </div>
    </div>`;
}

function gotoDetails(id) {
    if (!id) return;
    window.location.href = `/details/${id}`;
}

function gotoWatch(id, ep) {
    window.location.href = `/watch/${id}?ep=${ep}`;
}

// === SPOTLIGHT SEARCH ===
let spotlightOpen = false;
let spotlightResults = [];
let spotlightIdx = -1;

function openSpotlight() {
    const ov = document.getElementById('spotlightOverlay');
    const inp = document.getElementById('spotlightInput');
    if (!ov) return;
    ov.classList.add('active');
    spotlightOpen = true;
    setTimeout(() => inp && inp.focus(), 100);
    document.body.style.overflow = 'hidden';
}

function closeSpotlight() {
    const ov = document.getElementById('spotlightOverlay');
    if (!ov) return;
    ov.classList.remove('active');
    spotlightOpen = false;
    document.body.style.overflow = '';
    spotlightResults = [];
    spotlightIdx = -1;
}

function initSpotlight() {
    const ov = document.createElement('div');
    ov.className = 'spotlight-overlay';
    ov.id = 'spotlightOverlay';
    ov.innerHTML = `
    <div class="spotlight-modal">
        <div class="spotlight-search-wrap">
            <span class="s-icon">&#x1F50D;</span>
            <input type="text" id="spotlightInput" placeholder="Search anime..." autocomplete="off" spellcheck="false">
            <span class="esc-hint">ESC</span>
        </div>
        <div class="spotlight-results" id="spotlightResults">
            <div class="s-empty">Start typing to search</div>
        </div>
    </div>`;
    document.body.appendChild(ov);

    const inp = document.getElementById('spotlightInput');
    const res = document.getElementById('spotlightResults');
    let st;

    ov.addEventListener('click', (e) => {
        if (e.target === ov) closeSpotlight();
    });

    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            spotlightOpen ? closeSpotlight() : openSpotlight();
        }
        if (e.key === 'Escape' && spotlightOpen) closeSpotlight();
    });

    inp.addEventListener('input', () => {
        clearTimeout(st);
        const q = inp.value.trim();
        if (q.length < 2) {
            res.innerHTML = '<div class="s-empty">Keep typing to search...</div>';
            spotlightResults = [];
            spotlightIdx = -1;
            return;
        }
        st = setTimeout(async () => {
            try {
                const r = await fetch(`${API}/search?q=${encodeURIComponent(q)}`);
                const data = await r.json();
                spotlightResults = data || [];
                spotlightIdx = -1;
                if (!spotlightResults.length) {
                    res.innerHTML = '<div class="s-empty">No results found</div>';
                    return;
                }
                renderSpotlightResults();
            } catch (e) {
                res.innerHTML = '<div class="s-empty">Error searching</div>';
            }
        }, 200);
    });

    inp.addEventListener('keydown', (e) => {
        if (!spotlightResults.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            spotlightIdx = Math.min(spotlightIdx + 1, spotlightResults.length - 1);
            renderSpotlightResults();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            spotlightIdx = Math.max(spotlightIdx - 1, -1);
            renderSpotlightResults();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = spotlightResults[spotlightIdx >= 0 ? spotlightIdx : 0];
            if (item) {
                const id = item.Id || item._id || item.finder || '';
                closeSpotlight();
                gotoDetails(id);
            }
        }
    });
}

function renderSpotlightResults() {
    const res = document.getElementById('spotlightResults');
    if (!res) return;
    res.innerHTML = spotlightResults.map((item, i) => {
        const img = fixImg(item.Image || '');
        const id = item.Id || item._id || '';
        const name = item.Name || 'Unknown';
        const sel = i === spotlightIdx ? 'selected' : '';
        return `
        <div class="spotlight-item ${sel}" onclick="selectSpotlight('${id || item.finder || ''}')">
            <img src="${img}" alt="" onerror="this.style.display='none'">
            <div class="si-info">
                <div class="si-name">${name}</div>
                <div class="si-meta">ID: ${id || item.finder || 'N/A'}</div>
            </div>
        </div>`;
    }).join('');
    if (spotlightIdx >= 0 && spotlightIdx < spotlightResults.length) {
        const el = res.querySelector('.selected');
        if (el) el.scrollIntoView({ block: 'nearest' });
    }
}

function selectSpotlight(id) {
    if (!id) return;
    closeSpotlight();
    gotoDetails(id);
}

// === NAVBAR SCROLL ===
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// === SUB/DUB TOGGLE INIT ===
function initSubDub() {
    const val = getSubDub();
    document.querySelectorAll('.sub-dub-toggle button').forEach(b => {
        b.classList.toggle('active', b.dataset.sd === val);
    });
    const iframe = document.querySelector('.watch-player-wrap iframe');
    if (iframe) {
        const nxt = replaceSubDub(iframe.src, val);
        if (nxt !== iframe.src) iframe.src = nxt;
    }
}

// === HERO PARALLAX ===
function initHeroParallax() {
    const hero = document.querySelector('.hero');
    const bg = hero ? hero.querySelector('.hero-bg') : null;
    if (!bg) return;
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const maxScroll = window.innerHeight;
        const offset = scrolled > maxScroll ? maxScroll : scrolled;
        bg.style.transform = `translateY(${offset * 0.35}px)`;
    });
}

// === HOME PAGE ===
async function loadHero() {
    const hero = document.getElementById('hero');
    if (!hero) return;
    try {
        const res = await fetch(`${API}/top?page=1`);
        const data = await res.json();
        const items = data.AniData || [];
        if (!items.length) return;
        const top = items[0];
        const img = fixImg(top.ImagePath || top.Image || '');
        const desc = (top.DescripTion || '').replace(/<[^>]*>/g, '').trim();
        const finder = top.finder || top._id || '';
        hero.innerHTML = `
        <img class="hero-bg" src="${img}" alt="" onerror="this.style.display='none'">
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <h1 class="hero-title">${top.Name || 'Anime'}</h1>
            <div class="hero-meta">
                <span class="score">★ ${top.MALScore || '?'}</span>
                <span class="dot"></span>
                <span>${top.RatingsNum || ''} ratings</span>
                ${top.Premiered ? `<span class="dot"></span><span>${top.Premiered}</span>` : ''}
                ${top.Status ? `<span class="badge">${top.Status}</span>` : ''}
            </div>
            <p class="hero-desc">${desc.slice(0, 300)}${desc.length > 300 ? '...' : ''}</p>
            <div class="hero-btns">
                <button class="btn btn-primary" onclick="gotoDetails('${finder}')">&#9654; View Details</button>
                <button class="btn btn-secondary" onclick="openSpotlight()">&#x1F50D; Search</button>
            </div>
        </div>`;
        initHeroParallax();
    } catch (e) {
        console.error('Hero load error:', e);
        hero.innerHTML = `<div class="error-state"><h2>Welcome to AnimeTwin</h2><p>Discover and stream your favorite anime</p></div>`;
    }
}

async function loadRow(id, url) {
    const container = document.getElementById(id);
    if (!container) return;
    try {
        const res = await fetch(url);
        const data = await res.json();
        let items = data.AniData || data.wholePage || data || [];
        if (Array.isArray(items) && items.length > 0) {
            container.innerHTML = items.slice(0, 15).map(item => cardHTML(item)).join('');
        } else if (data.length > 1 && Array.isArray(data[1])) {
            container.innerHTML = data[1].slice(0, 15).map(item => cardHTML(item)).join('');
        }
    } catch (e) {
        console.error(`Row ${id} error:`, e);
    }
}

async function loadHome() {
    await loadHero();
    await Promise.all([
        loadRow('topRatedRow', `${API}/top?page=1`),
        loadRow('actionRow', `${API}/genre/action?page=1`),
        loadRow('romanceRow', `${API}/genre/romance?page=1`),
        loadRow('fantasyRow', `${API}/genre/fantasy?page=1`),
    ]);
}

if (document.getElementById('topRatedRow')) loadHome();

// === DETAIL PAGE ===
async function loadDetails() {
    const header = document.getElementById('detailHeader');
    const body = document.getElementById('detailBody');
    if (!header) return;

    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (!id) return;

    try {
        const [infoRes, streamRes, fullRes] = await Promise.all([
            fetch(`${API}/info/${id}`),
            fetch(`${API}/stream/${id}`),
            fetch(`${API}/full/${id}`),
        ]);

        const info = await infoRes.json();
        const stream = await streamRes.json();
        const full = await fullRes.json();

        if (info.error) {
            header.innerHTML = `<div class="error-state"><h2>Anime not found</h2><p>${info.error}</p></div>`;
            return;
        }

        const img = fixImg(info.ImagePath || info.Image || '');
        const cover = fixImg(info.Cover || info.ImagePath || info.Image || '');
        const desc = (info.DescripTion || info.description || '').replace(/<[^>]*>/g, '').trim();
        const genres = info.Genres || info.genres || [];
        const sd = getSubDub();

        header.innerHTML = `
        <img class="detail-bg" src="${cover}" alt="" onerror="this.style.display='none'">
        <div class="detail-overlay"></div>
        <div class="detail-content">
            <img class="detail-poster" src="${img}" alt="${info.Name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 280%22><rect fill=%22%2312121a%22 width=%22200%22 height=%22280%22/><text fill=%22%23666%22 font-size=%2214%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22>No Image</text></svg>'">
            <div class="detail-info">
                <h1 class="detail-title">${info.Name || info.name || 'Unknown'}</h1>
                ${info.Synonyms ? `<div class="detail-synonyms">${info.Synonyms}</div>` : ''}
                <div class="detail-meta">
                    ${info.MALScore ? `<span class="score">★ ${info.MALScore}</span>` : ''}
                    ${info.RatingsNum ? `<span>${info.RatingsNum} ratings</span>` : ''}
                    ${info.Status ? `<span class="status">${info.Status}</span>` : ''}
                    ${info.Premiered ? `<span>${info.Premiered}</span>` : ''}
                    ${info.Aired ? `<span>${info.Aired}</span>` : ''}
                </div>
                ${genres.length ? `<div class="detail-tags">${genres.map(g => `<a href="/genre?g=${g.toLowerCase()}" class="tag">${g}</a>`).join('')}</div>` : ''}
                ${desc ? `<p class="detail-desc">${desc}</p>` : ''}
                <div class="detail-extras">
                    ${info.Duration ? `<span><strong>Duration:</strong> ${info.Duration}</span>` : ''}
                    ${info.Studios ? `<span><strong>Studio:</strong> ${info.Studios}</span>` : ''}
                    ${info.epCount ? `<span><strong>Episodes:</strong> ${info.epCount}</span>` : ''}
                </div>
                <div style="margin-top: 20px;">
                    <div class="sub-dub-toggle">
                        <button data-sd="sub" onclick="setSubDub('sub');reloadWithSubDub()">SUB</button>
                        <button data-sd="dub" onclick="setSubDub('dub');reloadWithSubDub()">DUB</button>
                    </div>
                    <script>initSubDub()<\/script>
                </div>
            </div>
        </div>`;

        // Episodes
        let epCount = info.epCount || 0;
        let episodes = [];

        if (stream.local) {
            if (stream.local.link) {
                episodes.push({ num: 1, link: stream.local.link });
            }
            if (stream.local.ep && stream.local.ep.length) {
                stream.local.ep.forEach((ep, i) => {
                    episodes.push({ num: i + 2, link: ep.link });
                });
            }
        }

        if (episodes.length) {
            let epHtml = `<div class="detail-sub-section">
                <h2 class="section-title">Episodes <span class="accent">(${episodes.length})</span></h2>
            </div>
            <div class="episodes-grid">`;
            episodes.forEach(ep => {
                const link = ep.link.replace(/\/[a-z]{3}$/, '/' + sd);
                epHtml += `<div class="ep-btn" onclick="gotoWatch('${id}', ${ep.num})">
                    <span>EP ${ep.num}</span>
                </div>`;
            });
            epHtml += `</div>`;
            body.innerHTML = epHtml;
        } else if (epCount) {
            let epHtml = `<div class="detail-sub-section">
                <h2 class="section-title">Episodes <span class="accent">(${epCount})</span></h2>
            </div>
            <div class="episodes-grid">`;
            for (let i = 1; i <= Math.min(epCount, 100); i++) {
                epHtml += `<div class="ep-btn" onclick="gotoWatch('${id}', ${i})">
                    <span>EP ${i}</span>
                </div>`;
            }
            epHtml += `</div>`;
            body.innerHTML = epHtml;
        }

        // Characters
        if (full.characters && full.characters.length) {
            let charHtml = `<h2 class="section-title" style="margin: 40px 0 16px;">Characters &amp; Voice Actors</h2>
            <div class="characters-grid">`;
            full.characters.slice(0, 12).forEach(c => {
                const ch = c.character || {};
                const va = c.voice_actors && c.voice_actors.length ? c.voice_actors[0] : null;
                const vaName = va ? va.person.name : '';
                const chImg = ch.images && ch.images.jpg ? fixImg(ch.images.jpg.image_url) : '';
                charHtml += `
                <div class="char-card">
                    <img src="${chImg}" alt="${ch.name}" loading="lazy" onerror="this.style.display='none'">
                    <div class="char-body">
                        <div class="char-name">${ch.name || '?'}</div>
                        <div class="char-role">${c.role || ''}</div>
                        ${vaName ? `<div class="char-va">VA: ${vaName}</div>` : ''}
                    </div>
                </div>`;
            });
            charHtml += `</div>`;
            body.innerHTML += charHtml;
        }

    } catch (e) {
        console.error('Detail load error:', e);
        header.innerHTML = `<div class="error-state"><h2>Error loading details</h2><p>${e.message}</p></div>`;
    }
}

function reloadWithSubDub() {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    if (id) loadDetails();
}

if (document.getElementById('detailHeader')) loadDetails();

// === WATCH PAGE ===
async function loadWatch() {
    const playerWrap = document.getElementById('playerWrap');
    const infoEl = document.getElementById('watchInfo');
    const episodesGrid = document.getElementById('episodesGrid');
    if (!playerWrap) return;

    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    const params = new URLSearchParams(window.location.search);
    let currentEp = parseInt(params.get('ep')) || 1;
    const sd = getSubDub();

    try {
        const [infoRes, streamRes] = await Promise.all([
            fetch(`${API}/info/${id}`),
            fetch(`${API}/stream/${id}`),
        ]);

        const info = await infoRes.json();
        const stream = await streamRes.json();

        if (info.error && stream.error) {
            playerWrap.innerHTML = `<div class="error-state"><h2>Error</h2><p>Could not load this anime.</p></div>`;
            return;
        }

        const name = info.Name || info.name || 'Anime';

        let episodes = [];
        if (stream.local) {
            if (stream.local.link) {
                episodes.push({ num: 1, link: stream.local.link });
            }
            if (stream.local.ep && stream.local.ep.length) {
                stream.local.ep.forEach((ep, i) => {
                    episodes.push({ num: i + 2, link: ep.link });
                });
            }
        }

        if (!episodes.length && info.epCount) {
            for (let i = 1; i <= Math.min(info.epCount, 100); i++) {
                episodes.push({ num: i, link: '' });
            }
        }

        let currentEpData = episodes.find(e => e.num === currentEp);
        if (!currentEpData && episodes.length) {
            currentEp = episodes[0].num;
            currentEpData = episodes[0];
        }

        if (currentEpData && currentEpData.link) {
            const streamLink = replaceSubDub(currentEpData.link, sd);
            playerWrap.innerHTML = `<iframe src="${streamLink}" allowfullscreen loading="lazy" allow="encrypted-media; autoplay; fullscreen"></iframe>`;
        } else {
            playerWrap.innerHTML = `<div class="error-state" style="padding:80px;"><h2>No stream available</h2><p>Episode ${currentEp} has no stream link.</p></div>`;
        }

        infoEl.innerHTML = `
        <div class="watch-info-left">
            <h1 class="watch-title">${name}</h1>
            <div class="watch-sub">Episode ${currentEp}${info.epCount ? ` &middot; ${info.epCount} total` : ''}</div>
        </div>
        <div class="watch-info-right">
            <div class="sub-dub-toggle">
                <button data-sd="sub" onclick="setSubDub('sub');toggleWatchDubSub()">SUB</button>
                <button data-sd="dub" onclick="setSubDub('dub');toggleWatchDubSub()">DUB</button>
            </div>
        </div>`;
        initSubDub();

        if (episodes.length) {
            episodesGrid.innerHTML = episodes.map(ep => `
                <a href="/watch/${id}?ep=${ep.num}" class="ep-btn ${ep.num === currentEp ? 'current' : ''}">
                    <span>EP ${ep.num}</span>
                </a>
            `).join('');
        }

    } catch (e) {
        console.error('Watch load error:', e);
        playerWrap.innerHTML = `<div class="error-state" style="padding:80px;"><h2>Error loading player</h2><p>${e.message}</p></div>`;
    }
}

function toggleWatchDubSub() {
    const iframe = document.querySelector('.watch-player-wrap iframe');
    if (!iframe) return;
    const sd = getSubDub();
    const nxt = replaceSubDub(iframe.src, sd);
    if (nxt !== iframe.src) iframe.src = nxt;
}

if (document.getElementById('playerWrap')) loadWatch();

// === SEARCH PAGE ===
async function loadSearchResults() {
    const grid = document.getElementById('searchGrid');
    const title = document.getElementById('searchTitle');
    const pagination = document.getElementById('searchPagination');
    if (!grid) return;

    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    let page = parseInt(params.get('page')) || 1;

    if (!q) {
        title.textContent = 'Search Anime';
        grid.innerHTML = '<div class="error-state"><h2>Enter a search term</h2></div>';
        return;
    }

    title.textContent = `Results for "${q}"`;

    try {
        const res = await fetch(`${API}/searchall?q=${encodeURIComponent(q)}&page=${page}`);
        const data = await res.json();
        const items = data.AniData || [];

        if (!items.length) {
            grid.innerHTML = '<div class="error-state"><h2>No results found</h2><p>Try a different search term.</p></div>';
            pagination.innerHTML = '';
            return;
        }

        grid.innerHTML = items.map(item => cardHTML(item)).join('');

        pagination.innerHTML = `
        <button class="page-btn" onclick="goSearchPage('${q}', ${page - 1})" ${page <= 1 ? 'disabled' : ''}>&#8592; Prev</button>
        <span class="page-info">Page ${data.currentPage || page}</span>
        <button class="page-btn" onclick="goSearchPage('${q}', ${page + 1})" ${items.length < 20 ? 'disabled' : ''}>Next &#8594;</button>`;

    } catch (e) {
        grid.innerHTML = `<div class="error-state"><h2>Error</h2><p>${e.message}</p></div>`;
    }
}

function goSearchPage(q, page) {
    window.location.href = `/search?q=${encodeURIComponent(q)}&page=${page}`;
}

if (document.getElementById('searchGrid')) loadSearchResults();

// === GENRE PAGE ===
async function loadGenrePage() {
    const grid = document.getElementById('genreGrid');
    const title = document.getElementById('genreResultTitle');
    const pagination = document.getElementById('genrePagination');
    if (!grid) return;

    const params = new URLSearchParams(window.location.search);
    let genre = params.get('g') || '';
    let sort = params.get('sort') || '';
    let page = parseInt(params.get('page')) || 1;

    if (genre) {
        document.querySelectorAll('.genre-tag').forEach(t => {
            t.classList.toggle('active', t.dataset.genre === genre);
        });
    }

    document.querySelectorAll('.genre-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            window.location.href = `/genre?g=${tag.dataset.genre}&page=1`;
        });
    });

    let url;
    if (genre) {
        url = `${API}/genre/${genre}?page=${page}`;
        title.textContent = `${genre.charAt(0).toUpperCase() + genre.slice(1)} Anime`;
    } else {
        url = `${API}/top?page=${page}`;
        title.textContent = 'Top Rated Anime';
    }

    try {
        const res = await fetch(url);
        const data = await res.json();
        let items = data.AniData || data.wholePage || data || [];
        if (data.length > 1 && Array.isArray(data[1])) {
            items = data[1];
        }

        if (!items || !items.length) {
            grid.innerHTML = '<div class="error-state"><h2>No anime found</h2></div>';
            pagination.innerHTML = '';
            return;
        }

        grid.innerHTML = items.map(item => cardHTML(item)).join('');

        const currentPage = data.currentPage || page;
        pagination.innerHTML = `
        <button class="page-btn" onclick="goGenrePage('${genre}', '${sort}', ${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>&#8592; Prev</button>
        <span class="page-info">Page ${currentPage}</span>
        <button class="page-btn" onclick="goGenrePage('${genre}', '${sort}', ${currentPage + 1})" ${items.length < 20 ? 'disabled' : ''}>Next &#8594;</button>`;

    } catch (e) {
        grid.innerHTML = `<div class="error-state"><h2>Error</h2><p>${e.message}</p></div>`;
    }
}

function goGenrePage(genre, sort, page) {
    if (genre) return window.location.href = `/genre?g=${genre}&page=${page}`;
    if (sort) return window.location.href = `/genre?sort=${sort}&page=${page}`;
    window.location.href = `/genre?page=${page}`;
}

if (document.getElementById('genreGrid')) loadGenrePage();

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    initSpotlight();
    initSubDub();
});
