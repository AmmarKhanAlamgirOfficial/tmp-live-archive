document.addEventListener('DOMContentLoaded', () => {
    // 1. Social Media Script Loaders
    const scripts = { instagram: '//www.instagram.com/embed.js', facebook: 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0', tiktok: 'https://www.tiktok.com/embed.js', reddit: 'https://embed.reddit.com/widgets.js', telegram: 'https://telegram.org/js/telegram-widget.js?22', linkedin: 'https://platform.linkedin.com/Voyager/js/posts/embed.js' };
    
    if (document.querySelector('.twitter-tweet')) {
        window.twttr = (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0], t = window.twttr || {};
            if (d.getElementById(id)) return t;
            js = d.createElement(s); js.id = id; js.src = "https://platform.twitter.com/widgets.js";
            fjs.parentNode.insertBefore(js, fjs);
            t._e = []; t.ready = function(f) { t._e.push(f); }; return t;
        }(document, "script", "twitter-wjs"));
    }
    if (document.querySelector('.instagram-media')) { const s = document.createElement('script'); s.src = scripts.instagram; s.async = true; document.body.appendChild(s); }
    if (document.querySelector('.fb-post')) { const s = document.createElement('script'); s.src = scripts.facebook; s.async = true; s.defer = true; s.crossOrigin = "anonymous"; document.body.appendChild(s); }
    if (document.querySelector('.tiktok-embed')) { const s = document.createElement('script'); s.src = scripts.tiktok; s.async = true; document.body.appendChild(s); }
    if (document.querySelector('.reddit-embed-bq')) { const s = document.createElement('script'); s.src = scripts.reddit; s.async = true; document.body.appendChild(s); }
    if (document.querySelector('.telegram-post')) { const s = document.createElement('script'); s.src = scripts.telegram; s.async = true; document.body.appendChild(s); }
    if (document.querySelector('.linkedin-post')) { const s = document.createElement('script'); s.src = scripts.linkedin; s.async = true; document.body.appendChild(s); }

    // 2. Share & Like Logic (LocalStorage + API Sync)
    function safeJSONParse(dataStr, fallback = []) { try { const parsed = JSON.parse(dataStr); return parsed !== null ? parsed : fallback; } catch (e) { return fallback; } }
    if (!localStorage.getItem('anonClientId')) { localStorage.setItem('anonClientId', 'anon-' + Date.now() + Math.random().toString(36).substring(2, 9)); }

    const likedPosts = new Set(safeJSONParse(localStorage.getItem('likedLivePosts'), []));
    document.querySelectorAll('.like-btn').forEach(btn => { if (likedPosts.has(String(btn.dataset.postId))) btn.classList.add('is-liked'); });

    document.addEventListener('click', function(e) {
        // Share Action
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            e.preventDefault();
            const postId = shareBtn.dataset.postId;
            const postHeadline = shareBtn.dataset.postHeadline;
            const postUrl = `${window.location.origin}${window.location.pathname}#post-${postId}`;
            const shareText = `Archive Update: ${postHeadline}`; 
            
            if (window.AndroidInterface && typeof window.AndroidInterface.share === 'function') { 
                window.AndroidInterface.share(postHeadline, shareText, postUrl); 
            } else if (navigator.share) { 
                navigator.share({ title: postHeadline, text: shareText, url: postUrl }); 
            } else { 
                alert(`Share this link:\n${postUrl}`); 
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
            
            if (isNowLiked) { likeBtn.classList.add('is-liked'); likedPosts.add(postIdStr); } 
            else { likeBtn.classList.remove('is-liked'); likedPosts.delete(postIdStr); }
            
            likeBtn.classList.remove('animate-pop');
            void likeBtn.offsetWidth; // Trigger reflow
            likeBtn.classList.add('animate-pop');
            localStorage.setItem('likedLivePosts', JSON.stringify(Array.from(likedPosts)));
            
            if (postElement) {
                const likeCountSpan = postElement.querySelector(`#like-count-${postId}`);
                if (likeCountSpan) {
                    let currentCount = parseInt(likeCountSpan.textContent.replace(/,/g, '')) || 0;
                    likeCountSpan.textContent = isNowLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
                }
            }
            
            // Sync to TMP Analytics silently
            const action = isNowLiked ? 'increment' : 'decrement';
            fetch(`https://data.tmpnews.com/feed.json?log=like&post_id=${postId}&action=${action}&client_id=${localStorage.getItem('anonClientId')}`, { method: 'GET', cache: 'no-store' }).catch(()=>{});
            return;
        }
    });

    // 3. Android WebView Translations
    if (window.AndroidTranslator) {
        document.body.classList.add('android-app-view');
        window.currentTranslatingPostId = null;
        
        window.requestLivePostTranslation = function(postId, lang) {
            if (window.currentTranslatingPostId) return;
            window.currentTranslatingPostId = postId;
            const postElement = document.getElementById(`post-${postId}`);
            if (postElement) {
                const controls = postElement.querySelector('.live-translation-controls');
                if(controls) controls.style.opacity = '0.5';
                
                const headlineEl = postElement.querySelector('.live-post-headline');
                const contentDiv = postElement.querySelector('.post-body');
                const combinedText = (headlineEl ? headlineEl.innerText : "") + "|||||" + contentDiv.innerText;
                
                window.AndroidTranslator.requestTranslation(combinedText, lang);
            }
        };

        window.updateTranslationProgress = function(isProcessing) {
            if (!window.currentTranslatingPostId) return;
            const postElement = document.getElementById(`post-${window.currentTranslatingPostId}`);
            if (postElement) {
                const progressBar = postElement.querySelector('.translation-progress-container');
                const processingText = postElement.querySelector('.processing-text');
                const btns = postElement.querySelector('.live-translation-controls');
                
                if (isProcessing) {
                    if (progressBar) progressBar.style.display = 'block';
                    if (processingText) processingText.style.display = 'block';
                    if (btns) { btns.style.opacity = '0.5'; btns.style.pointerEvents = 'none'; }
                } else {
                    if (progressBar) progressBar.style.display = 'none';
                    if (processingText) processingText.style.display = 'none';
                    if (btns) { btns.style.opacity = '1'; btns.style.pointerEvents = 'auto'; }
                    window.currentTranslatingPostId = null;
                }
            }
        };

        window.updateContentWithTranslation = function(translatedText) {
            if (!window.currentTranslatingPostId) return;
            const postElement = document.getElementById(`post-${window.currentTranslatingPostId}`);
            if (postElement) {
                const contentDiv = postElement.querySelector('.post-body');
                contentDiv.querySelectorAll('.translated-text-block').forEach(el => el.remove());

                const parts = translatedText.split("|||||");
                const transHeadline = parts[0] ? parts[0].trim() : "";
                const transBody = parts[1] ? parts[1].trim() : translatedText;

                const translationContainer = document.createElement('div');
                translationContainer.className = 'translated-text-block';
                translationContainer.innerHTML = `<div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:#1e40af; margin-bottom:8px;">Translated Content</div><div class="translated-headline">${transHeadline}</div><div style="line-height:1.65;">${transBody.replace(/\n/g, '<br>')}</div>`;
                contentDiv.appendChild(translationContainer);
                
                const controls = postElement.querySelector('.live-translation-controls');
                if(controls) controls.style.opacity = '1';
            }
        };
    }
});