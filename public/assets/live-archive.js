/**
 * TMP Live Archive — Multilingual Controller & Feed Engine
 * Supports English, Hindi, and Urdu with real-time switching, URL params, RTL formatting, and chunked archival pagination.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Utilities & Storage ---
    function safeJSONParse(dataStr, fallback = []) {
        try {
            const parsed = JSON.parse(dataStr);
            return parsed !== null ? parsed : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    if (!localStorage.getItem('anonClientId')) {
        localStorage.setItem('anonClientId', 'anon-' + Date.now() + Math.random().toString(36).substring(2, 9));
    }

    const likedPosts = new Set(safeJSONParse(localStorage.getItem('likedLivePosts'), []));

    // --- 2. Localization Dictionary ---
    const LANG_STRINGS = {
        en: {
            title: "TMP Live Archive",
            subtitle: "Historical archive of live updates directly from the TMP Newsroom.",
            loadMore: "Load Previous Updates",
            loading: "Loading...",
            endOfArchive: "End of live archive history.",
            emptyTitle: "No Archived Updates in English",
            emptyDesc: "There are currently no archived updates found in this archive segment.",
            shareBtn: "Share",
            sharePrefix: "Live Archive Update:",
            locale: "en-US",
            dir: "ltr",
            htmlLang: "en"
        },
        hi: {
            title: "टीएमपी लाइव आर्काइव",
            subtitle: "टीएमपी न्यूज़रूम से लाइव अपडेट्स और ब्रेकिंग न्यूज़ का ऐतिहासिक संग्रह।",
            loadMore: "पुराने अपडेट्स लोड करें",
            loading: "लोड हो रहा है...",
            endOfArchive: "लाइव आर्काइव का अंत।",
            emptyTitle: "हिंदी में कोई आर्काइव अपडेट उपलब्ध नहीं",
            emptyDesc: "2025 के शुरुआती अपडेट्स मूल रूप से अंग्रेजी में उपलब्ध हैं। उन्हें देखने के लिए अंग्रेजी टैब चुनें।",
            shareBtn: "शेयर करें",
            sharePrefix: "लाइव आर्काइव अपडेट:",
            locale: "hi-IN",
            dir: "ltr",
            htmlLang: "hi"
        },
        ur: {
            title: "ٹی ایم پی لائیو آرکائیو",
            subtitle: "ٹی ایم پی نیوز روم سے لائیو اپڈیٹس اور بریکنگ نیوز کا تاریخی آرکائیو۔",
            loadMore: "پچھلی اپڈیٹس لوڈ کریں",
            loading: "لوڈ ہو رہا ہے...",
            endOfArchive: "لائیو آرکائیو کا اختتام۔",
            emptyTitle: "اردو میں کوئی آرکائیو اپڈیٹ دستیاب نہیں",
            emptyDesc: "2025 کے ابتدائی اپڈیٹس بنیادی طور پر انگریزی میں محفوظ ہیں۔ انہیں دیکھنے کے لیے انگلش ٹیب منتخب کریں۔",
            shareBtn: "شیئر کریں",
            sharePrefix: "لائیو آرکائیو اپڈیٹ:",
            locale: "ur-PK",
            dir: "rtl",
            htmlLang: "ur"
        }
    };

    // --- 3. Language State Initialization ---
    function detectInitialLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const queryLang = urlParams.get('lang');
        if (queryLang && ['en', 'hi', 'ur'].includes(queryLang.toLowerCase())) {
            return queryLang.toLowerCase();
        }
        const stored = localStorage.getItem('archive_preferred_lang');
        if (stored && ['en', 'hi', 'ur'].includes(stored)) {
            return stored;
        }
        return 'en';
    }

    let currentLang = detectInitialLanguage();
    const config = window.__ARCHIVE_CONFIG || { totalChunks: 1, initialPosts: [] };
    const totalChunks = config.totalChunks || 1;
    let currentChunk = totalChunks; // Start with latest chunk (e.g. 7)

    // In-memory cache for all fetched chunks to prevent redundant network requests
    const chunkCache = new Map();
    let allLoadedRawPosts = [];

    // Store initial posts into cache
    if (config.initialPosts && config.initialPosts.length > 0) {
        chunkCache.set(currentChunk, config.initialPosts);
        allLoadedRawPosts = [...config.initialPosts];
    }

    // DOM Elements
    const liveFeed = document.getElementById('live-feed');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const archiveEndMsg = document.getElementById('archive-end-msg');
    const archiveTitleText = document.getElementById('archive-title-text');
    const archiveSubtitle = document.getElementById('archive-subtitle');
    const langTabs = document.querySelectorAll('.lang-tab');

    // --- 4. Post Extraction & Filtering Helper ---
    function extractPostForLang(rawPost, targetLang) {
        if (!rawPost) return null;

        // 1. Check if post is bundled with multi-language translations
        if (rawPost.translations && typeof rawPost.translations === 'object') {
            const tr = rawPost.translations[targetLang];
            if (tr && (tr.content || tr.headline)) {
                return {
                    id: rawPost.id,
                    timestamp: rawPost.timestamp,
                    author_name: rawPost.author_name || 'TMP Live Team',
                    tags: rawPost.tags || [],
                    likes: rawPost.likes || 0,
                    views: rawPost.views || 0,
                    headline: tr.headline || '',
                    content: tr.content || '',
                    lang: targetLang
                };
            }
        }

        // 2. Check if post has a standalone language matching targetLang
        const postLang = (rawPost.lang || 'en').toLowerCase();
        if (postLang === targetLang) {
            return {
                id: rawPost.id,
                timestamp: rawPost.timestamp,
                author_name: rawPost.author_name || 'TMP Live Team',
                tags: rawPost.tags || [],
                likes: rawPost.likes || 0,
                views: rawPost.views || 0,
                headline: rawPost.headline || '',
                content: rawPost.content || '',
                lang: targetLang
            };
        }

        // If target is English and post has no translations and no explicit lang (legacy 2025 post)
        if (targetLang === 'en' && !rawPost.lang) {
            return {
                id: rawPost.id,
                timestamp: rawPost.timestamp,
                author_name: rawPost.author_name || 'TMP Live Team',
                tags: rawPost.tags || [],
                likes: rawPost.likes || 0,
                views: rawPost.views || 0,
                headline: rawPost.headline || '',
                content: rawPost.content || '',
                lang: 'en'
            };
        }

        // Never mix different languages!
        return null;
    }

    // --- 5. Render Individual Card HTML ---
    function renderPostHtml(post, lang) {
        const isUrdu = (lang === 'ur');
        const langConfig = LANG_STRINGS[lang] || LANG_STRINGS.en;
        const dateObj = new Date(post.timestamp);
        const dateStr = !isNaN(dateObj) 
            ? dateObj.toLocaleString(langConfig.locale, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })
            : '';

        const tagsHtml = (post.tags && post.tags.length > 0)
            ? `<div class="tags-container">${post.tags.map(t => `<a href="#" class="tag-badge">#${escapeHtml(t)}</a>`).join('')}</div>`
            : '';

        const headlineHtml = post.headline
            ? `<h2 class="live-post-headline">${escapeHtml(post.headline)}</h2>`
            : '';

        const parsedContent = (typeof marked !== 'undefined') ? marked.parse(post.content || '') : (post.content || '');
        const shareLabel = langConfig.shareBtn;

        return `
        <div class="live-post ${isUrdu ? 'lang-ur' : (lang === 'hi' ? 'lang-hi' : '')}" id="post-${post.id}" dir="${isUrdu ? 'rtl' : 'ltr'}">
            <div class="live-post-content">
                <div class="live-post-meta">
                    <div class="live-post-author-group">
                        <svg class="post-author-logo" viewBox="0 0 200 200" aria-hidden="true"><rect x="50" y="50" width="100" height="100" class="square"/><circle cx="100" cy="100" r="80" fill="none" stroke-width="8" class="static-circle"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="tmp-text">TMP</text></svg>
                        <span class="live-post-author">${escapeHtml(post.author_name || 'TMP Live Team')}</span>
                    </div>
                    <span class="live-post-time">${dateStr}</span>
                </div>
                ${headlineHtml}
                <div class="post-body">${parsedContent}</div>
                ${tagsHtml}
                <div class="post-footer">
                    <div class="post-stats" data-post-id="${post.id}">
                        <button class="like-btn ${likedPosts.has(String(post.id)) ? 'is-liked' : ''}" data-post-id="${post.id}" title="Like"><i class="fas fa-star"></i></button>
                        <span id="like-count-${post.id}" class="like-count" style="margin-left:0.5rem; margin-right:0.5rem;">${post.likes || 0}</span>
                        <div class="stat-item" style="margin-left: 1rem; margin-right: 1rem;"><i class="fas fa-eye" style="color:var(--text-muted);"></i><span style="margin-left:0.5rem; margin-right:0.5rem;">${post.views || 0}</span></div>
                    </div>
                    <button class="share-btn" data-post-id="${post.id}" data-post-headline="${escapeHtml(post.headline || 'Live Update')}">
                        <i class="fas fa-share-alt ${isUrdu ? 'ml-2' : 'mr-2'}"></i>${shareLabel}
                    </button>
                </div>
            </div>
        </div>`;
    }

    // --- 6. Apply Active Language & Render Feed ---
    async function applyLanguage(lang, preserveScroll = false) {
        currentLang = lang;
        const langConfig = LANG_STRINGS[lang] || LANG_STRINGS.en;

        // 1. Update UI Elements
        document.documentElement.lang = langConfig.htmlLang;
        document.documentElement.dir = langConfig.dir;
        liveFeed.setAttribute('dir', langConfig.dir);
        liveFeed.setAttribute('data-current-lang', lang);

        if (archiveTitleText) archiveTitleText.textContent = langConfig.title;
        if (archiveSubtitle) archiveSubtitle.textContent = langConfig.subtitle;
        if (loadMoreBtn) loadMoreBtn.textContent = langConfig.loadMore;
        if (archiveEndMsg) archiveEndMsg.textContent = langConfig.endOfArchive;

        // 2. Update Tabs
        langTabs.forEach(tab => {
            const isTabActive = (tab.dataset.lang === lang);
            tab.classList.toggle('active', isTabActive);
            tab.setAttribute('aria-selected', isTabActive ? 'true' : 'false');
        });

        // 3. Filter All Currently Loaded Posts
        const filteredPosts = [];
        allLoadedRawPosts.forEach(raw => {
            const p = extractPostForLang(raw, lang);
            if (p) filteredPosts.push(p);
        });

        // If no posts found in the current loaded chunks for Hindi/Urdu, auto-scan earlier chunks
        if (filteredPosts.length === 0 && currentChunk > 1) {
            liveFeed.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p style="margin-top: 0.5rem; font-weight: 600;">Searching archive chunks for ${lang.toUpperCase()} updates...</p>
                </div>`;

            let foundAny = false;
            while (currentChunk > 1 && !foundAny) {
                currentChunk--;
                const chunkPosts = await fetchChunk(currentChunk);
                if (chunkPosts && chunkPosts.length > 0) {
                    allLoadedRawPosts = [...allLoadedRawPosts, ...chunkPosts];
                    chunkPosts.forEach(raw => {
                        const p = extractPostForLang(raw, lang);
                        if (p) {
                            filteredPosts.push(p);
                            foundAny = true;
                        }
                    });
                }
            }
        }

        // 4. Render to Feed
        if (filteredPosts.length > 0) {
            liveFeed.innerHTML = filteredPosts.map(p => renderPostHtml(p, lang)).join('');
            if (archiveEndMsg) archiveEndMsg.style.display = (currentChunk <= 1) ? 'block' : 'none';
            if (loadMoreBtn) loadMoreBtn.style.display = (currentChunk > 1) ? 'inline-block' : 'none';
        } else {
            // Informative localized empty state
            liveFeed.innerHTML = `
                <div class="archive-empty-notice" dir="${langConfig.dir}">
                    <i class="fas fa-book-open"></i>
                    <h3>${langConfig.emptyTitle}</h3>
                    <p>${langConfig.emptyDesc}</p>
                </div>`;
            if (archiveEndMsg) archiveEndMsg.style.display = 'none';
            if (loadMoreBtn) loadMoreBtn.style.display = (currentChunk > 1) ? 'inline-block' : 'none';
        }

        // 5. Initialize Social & Media Embeds
        setTimeout(() => {
            if (window.initializeEmbeds) {
                window.initializeEmbeds();
            } else if (window.processAllPosts) {
                window.processAllPosts();
            }
        }, 150);
    }

    // --- 7. Fetch Chunk Helper ---
    async function fetchChunk(chunkNum) {
        if (chunkCache.has(chunkNum)) {
            return chunkCache.get(chunkNum);
        }
        const chunkId = String(chunkNum).padStart(3, '0');
        try {
            const resp = await fetch(`/archive-data/archive-${chunkId}.json`);
            if (!resp.ok) return [];
            const data = await resp.json();
            chunkCache.set(chunkNum, data);
            return data;
        } catch (e) {
            console.error(`Failed to load archive chunk ${chunkNum}:`, e);
            return [];
        }
    }

    // --- 8. Load More Chunks Action ---
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            const originalText = loadMoreBtn.textContent;
            const langConfig = LANG_STRINGS[currentLang] || LANG_STRINGS.en;
            loadMoreBtn.textContent = langConfig.loading;
            loadMoreBtn.disabled = true;

            try {
                if (currentChunk > 1) {
                    currentChunk--;
                    const nextPosts = await fetchChunk(currentChunk);
                    if (nextPosts && nextPosts.length > 0) {
                        allLoadedRawPosts = [...allLoadedRawPosts, ...nextPosts];

                        // Extract and append posts for active language
                        const newLanguagePosts = [];
                        nextPosts.forEach(raw => {
                            const p = extractPostForLang(raw, currentLang);
                            if (p) newLanguagePosts.push(p);
                        });

                        if (newLanguagePosts.length > 0) {
                            // If feed currently has empty notice, clear it
                            const emptyNotice = liveFeed.querySelector('.archive-empty-notice');
                            if (emptyNotice) liveFeed.innerHTML = '';

                            const newHtml = newLanguagePosts.map(p => renderPostHtml(p, currentLang)).join('');
                            liveFeed.insertAdjacentHTML('beforeend', newHtml);
                        }

                        // Re-process embeds
                        setTimeout(() => {
                            if (window.initializeEmbeds) {
                                window.initializeEmbeds();
                            } else if (window.processAllPosts) {
                                window.processAllPosts();
                            }
                        }, 150);
                    }
                }

                if (currentChunk <= 1) {
                    loadMoreBtn.style.display = 'none';
                    if (archiveEndMsg) archiveEndMsg.style.display = 'block';
                } else {
                    loadMoreBtn.textContent = originalText;
                    loadMoreBtn.disabled = false;
                }
            } catch (err) {
                console.error("Error loading chunk:", err);
                loadMoreBtn.textContent = "Error - Try Again";
                loadMoreBtn.disabled = false;
            }
        });
    }

    // --- 9. Language Tab Click Listener ---
    langTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetLang = tab.dataset.lang;
            if (targetLang === currentLang) return;

            // Update URL without page refresh
            const url = new URL(window.location);
            url.searchParams.set('lang', targetLang);
            window.history.replaceState({}, '', url);

            // Persist preference
            localStorage.setItem('archive_preferred_lang', targetLang);

            // Apply new language
            applyLanguage(targetLang);
        });
    });

    // --- 10. Global Event Delegation (Share & Like) ---
    document.addEventListener('click', function(e) {
        // Share Action
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            e.preventDefault();
            const postId = shareBtn.dataset.postId;
            const postHeadline = shareBtn.dataset.postHeadline;
            const postUrl = `${window.location.origin}${window.location.pathname}?lang=${currentLang}#post-${postId}`;
            const langConfig = LANG_STRINGS[currentLang] || LANG_STRINGS.en;
            const shareText = `${langConfig.sharePrefix} ${postHeadline}`;

            if (window.AndroidInterface && typeof window.AndroidInterface.share === 'function') {
                window.AndroidInterface.share(postHeadline, shareText, postUrl);
            } else if (navigator.share) {
                navigator.share({ title: postHeadline, text: shareText, url: postUrl }).catch(() => {});
            } else {
                navigator.clipboard.writeText(postUrl).then(() => {
                    const orig = shareBtn.innerHTML;
                    shareBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Copied!';
                    setTimeout(() => { shareBtn.innerHTML = orig; }, 2000);
                }).catch(() => {
                    prompt("Copy link:", postUrl);
                });
            }
            return;
        }

        // Like Action
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            e.preventDefault();
            const postId = likeBtn.dataset.postId;
            const postIdStr = String(postId);
            const postElement = document.getElementById(`post-${postId}`);
            const isNowLiked = !likedPosts.has(postIdStr);

            if (isNowLiked) {
                likeBtn.classList.add('is-liked');
                likedPosts.add(postIdStr);
            } else {
                likeBtn.classList.remove('is-liked');
                likedPosts.delete(postIdStr);
            }

            likeBtn.classList.remove('animate-pop');
            void likeBtn.offsetWidth;
            likeBtn.classList.add('animate-pop');
            localStorage.setItem('likedLivePosts', JSON.stringify(Array.from(likedPosts)));

            if (postElement) {
                const likeCountSpan = postElement.querySelector(`#like-count-${postId}`);
                if (likeCountSpan) {
                    let currentCount = parseInt(likeCountSpan.textContent.replace(/,/g, '')) || 0;
                    likeCountSpan.textContent = isNowLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
                }
            }

            const action = isNowLiked ? 'increment' : 'decrement';
            fetch(`https://data.tmpnews.com/feed.json?log=like&post_id=${postId}&action=${action}&client_id=${localStorage.getItem('anonClientId')}`, { method: 'GET', cache: 'no-store' }).catch(()=>{});
            return;
        }
    });

    // --- 11. Initial Kickoff ---
    applyLanguage(currentLang);
});