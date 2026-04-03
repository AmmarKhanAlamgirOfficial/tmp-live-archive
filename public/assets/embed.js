document.addEventListener('DOMContentLoaded', () => {

    function parseRawContent(rawText) {
        if (!rawText || typeof rawText !== 'string') return '';

        let tempContent = rawText;

        // Unescape HTML entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = tempContent;
        tempContent = textarea.value;

        const placeholders = [];

        // Match social media links: [type|desc](url) OR [type](url) OR ![alt](img_url)
        const regex = /\[(twitter-video|twitter|instagram-video|instagram|facebook|youtube|tiktok|linkedin|reddit|telegram)\|?([^\]]*)?\]\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\)/g;

        tempContent = tempContent.replace(regex, (match, socialType, socialDesc, socialUrl, imgAlt, imgUrl) => {
            let htmlBlock = '';
            const caption = socialDesc && socialDesc.trim() !== '' ? `<p class="media-caption">${socialDesc}</p>` : '';
            const imgCaption = imgAlt && imgAlt.trim() !== '' ? `<p class="media-caption">${imgAlt}</p>` : '';

            if (socialType) {
                switch (socialType) {
                    case 'youtube':
                        // Comprehensive YouTube URL parsing
                        let videoId = extractYouTubeId(socialUrl);
                        
                        console.log('YouTube URL:', socialUrl, 'Extracted ID:', videoId);

                        if (videoId && isValidYouTubeId(videoId)) {
                            // PROFESSIONAL YOUTUBE EMBED - No gaps
                            htmlBlock = `<div class="youtube-embed my-4" data-gap-removed="true">
                                <iframe 
                                    src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen
                                    loading="lazy"
                                    title="YouTube video player"
                                    class="youtube-iframe"
                                    style="margin: 0 !important; padding: 0 !important; display: block !important;">
                                </iframe>
                                ${caption}
                            </div>`;
                        } else {
                            
                            htmlBlock = `<div class="embed-error my-4">
                                <p><i class="fas fa-exclamation-triangle mr-2"></i>Could not embed YouTube video</p>
                                <a href="${socialUrl}" target="_blank" class="social-link" rel="noopener">
                                    <i class="fab fa-youtube mr-2"></i>Watch on YouTube: ${getYouTubeUrlDisplay(socialUrl)}
                                </a>
                                ${videoId ? `<p class="text-sm text-gray-600 mt-2">Video ID: ${videoId}</p>` : ''}
                            </div>`;
                        }
                        break;

                    case 'twitter':
                    case 'twitter-video':
                        const twitterUrl = socialUrl.replace('x.com', 'twitter.com');
                        htmlBlock = `<div class="embed-container twitter-embed my-4" data-gap-removed="true">
                            <blockquote class="twitter-tweet" data-dnt="true" data-theme="light" data-align="center" data-lazy="true" style="margin: 0 !important; padding: 0 !important;">
                                <a href="${twitterUrl}"></a>
                            </blockquote>
                            ${caption}
                        </div>`;
                        break;

                    case 'instagram':
                    case 'instagram-video':
                        htmlBlock = `<div class="embed-container instagram-embed my-4" data-gap-removed="true">
                            <blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${socialUrl}" data-instgrm-version="14" data-instgrm-lazy="true" style="margin: 0 !important; padding: 0 !important;"></blockquote>
                            ${caption}
                        </div>`;
                        break;

                    case 'facebook':
                        htmlBlock = `<div class="embed-container facebook-embed my-4" data-gap-removed="true">
                            <div class="fb-post" data-href="${socialUrl}" data-width="auto" data-show-text="true" data-lazy="true" style="margin: 0 !important; padding: 0 !important;"></div>
                            ${caption}
                        </div>`;
                        break;

                    case 'tiktok':
                        htmlBlock = `<div class="embed-container tiktok-embed my-4" data-gap-removed="true">
                            <blockquote class="tiktok-embed" cite="${socialUrl}" data-video-id="${socialUrl.split('/').pop()}" data-lazy="true" style="margin: 0 !important; padding: 0 !important;">
                                <section></section>
                            </blockquote>
                            ${caption}
                        </div>`;
                        break;

                    case 'linkedin':
                        htmlBlock = `<div class="embed-container linkedin-embed my-4">
                            <div class="linkedin-post" data-url="${socialUrl}">
                                <a href="${socialUrl}" target="_blank" class="social-link professional-link" rel="noopener">
                                    <i class="fab fa-linkedin mr-2"></i>View LinkedIn Post
                                </a>
                            </div>
                            ${caption}
                        </div>`;
                        break;

                    case 'reddit':
                        htmlBlock = `<div class="embed-container reddit-embed my-4">
                            <div class="reddit-post" data-url="${socialUrl}">
                                <a href="${socialUrl}" target="_blank" class="social-link professional-link" rel="noopener">
                                    <i class="fab fa-reddit mr-2"></i>View Reddit Post
                                </a>
                            </div>
                            ${caption}
                        </div>`;
                        break;

                    default:
                        htmlBlock = `<div class="embed-container generic-embed my-4">
                            <a href="${socialUrl}" target="_blank" class="social-link professional-link w-full text-center" rel="noopener">
                                <i class="fas fa-external-link-alt mr-2"></i>${socialType.charAt(0).toUpperCase() + socialType.slice(1)}: ${getDomainFromUrl(socialUrl)}
                            </a>
                            ${caption}
                        </div>`;
                        break;
                }

            } else if (imgUrl) {
                // Handle images with professional styling
                htmlBlock = `<div class="image-embed my-4">
                    <img src="${imgUrl}" alt="${imgAlt || ''}" class="embedded-image" loading="lazy" style="margin: 0 !important; padding: 0 !important;">
                    ${imgCaption}
                </div>`;
            }

            placeholders.push(htmlBlock);
            return `__PLACEHOLDER_${placeholders.length - 1}__`;
        });

        // Process paragraphs and text formatting
        const processedText = tempContent.split('\n\n').map(paragraph => {
            if (paragraph.startsWith('__PLACEHOLDER_')) return paragraph;
            if (paragraph.trim() === '') return '';
            
            // Handle blockquotes
            if (paragraph.startsWith('&gt;')) {
                return `<blockquote class="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600 bg-gray-50 py-2 rounded-r">
                    ${paragraph.substring(4).trim().replace(/\n/g, '<br>')}
                </blockquote>`;
            }
            
            // Handle code blocks (basic support)
            if (paragraph.startsWith('```') && paragraph.endsWith('```')) {
                const codeContent = paragraph.slice(3, -3).trim();
                return `<pre class="bg-gray-800 text-gray-100 p-4 rounded my-4 overflow-x-auto"><code>${codeContent}</code></pre>`;
            }
            
            // Regular paragraphs
            return `<p class="my-4 leading-relaxed">${paragraph.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        // Replace placeholders with actual HTML
        const finalHtml = processedText.replace(/__PLACEHOLDER_(\d+)__/g, (match, index) => {
            return placeholders[parseInt(index, 10)] || '';
        });

        return finalHtml;
    }

    // YouTube ID extraction utility
    function extractYouTubeId(url) {
        if (!url) return null;
        
        const patterns = [
            // youtube.com/watch?v=ID
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            // youtu.be/ID
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            // youtube.com/embed/ID
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            // youtube.com/shorts/ID
            /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
            // youtube.com/v/ID
            /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
            // youtube.com/live/ID
            /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                // Clean up any additional parameters
                return match[1].split('?')[0].split('&')[0];
            }
        }

        return null;
    }

    // Validate YouTube ID format
    function isValidYouTubeId(id) {
        return /^[a-zA-Z0-9_-]{11}$/.test(id);
    }

    // Get display URL for YouTube
    function getYouTubeUrlDisplay(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname + urlObj.pathname;
        } catch {
            return url;
        }
    }

    // Extract domain from URL for display
    function getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
    }

    // Social media scripts loader with gap removal
    function loadSocialScripts() {
        console.log('Loading social media scripts with gap removal...');
        
        // Load Twitter widget
        if (document.querySelector('.twitter-tweet') && !window.twttr) {
            const twitterScript = document.createElement('script');
            twitterScript.src = 'https://platform.twitter.com/widgets.js';
            twitterScript.async = true;
            twitterScript.charset = 'utf-8';
            twitterScript.setAttribute('data-lazy', 'true');
            document.body.appendChild(twitterScript);
            
            twitterScript.onload = () => {
                console.log('Twitter script loaded successfully');
                if (window.twttr && window.twttr.widgets) {
                    // Remove Twitter gaps after loading
                    setTimeout(() => {
                        window.twttr.widgets.load();
                        document.querySelectorAll('.twitter-tweet').forEach(tweet => {
                            tweet.style.margin = '0';
                            tweet.style.padding = '0';
                            tweet.style.border = 'none';
                        });
                    }, 100);
                }
            };
            
            twitterScript.onerror = () => {
                console.error('Failed to load Twitter widget script');
            };
        }

        // Load Instagram widget
        if (document.querySelector('.instagram-media') && !window.instgrm) {
            const instagramScript = document.createElement('script');
            instagramScript.src = '//www.instagram.com/embed.js';
            instagramScript.async = true;
            instagramScript.setAttribute('data-lazy', 'true');
            document.body.appendChild(instagramScript);
            
            instagramScript.onload = () => {
                console.log('Instagram script loaded successfully');
                if (window.instgrm && window.instgrm.Embeds) {
                    // Remove Instagram gaps after loading
                    setTimeout(() => {
                        window.instgrm.Embeds.process();
                        document.querySelectorAll('.instagram-media').forEach(insta => {
                            insta.style.margin = '0';
                            insta.style.padding = '0';
                            insta.style.border = 'none';
                        });
                    }, 100);
                }
            };
            
            instagramScript.onerror = () => {
                console.error('Failed to load Instagram embed script');
            };
        }

        // Load Facebook SDK
        if (document.querySelector('.fb-post') && !window.FB) {
            const facebookScript = document.createElement('script');
            facebookScript.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0';
            facebookScript.async = true;
            facebookScript.defer = true;
            facebookScript.crossOrigin = 'anonymous';
            facebookScript.setAttribute('data-lazy', 'true');
            document.body.appendChild(facebookScript);
            
            facebookScript.onload = () => {
                console.log('Facebook script loaded successfully');
                if (window.FB) {
                    // Remove Facebook gaps after loading
                    setTimeout(() => {
                        window.FB.XFBML.parse();
                        document.querySelectorAll('.fb-post').forEach(post => {
                            post.style.margin = '0';
                            post.style.padding = '0';
                            post.style.border = 'none';
                        });
                    }, 100);
                }
            };
            
            facebookScript.onerror = () => {
                console.error('Failed to load Facebook SDK');
            };
        }

        // Load TikTok widget
        if (document.querySelector('.tiktok-embed') && !window.tiktokEmbed) {
            const tiktokScript = document.createElement('script');
            tiktokScript.src = 'https://www.tiktok.com/embed.js';
            tiktokScript.async = true;
            tiktokScript.setAttribute('data-lazy', 'true');
            document.body.appendChild(tiktokScript);
            
            tiktokScript.onload = () => {
                console.log('TikTok script loaded successfully');
                // Remove TikTok gaps
                document.querySelectorAll('.tiktok-embed').forEach(tiktok => {
                    tiktok.style.margin = '0';
                    tiktok.style.padding = '0';
                    tiktok.style.border = 'none';
                });
            };
            
            tiktokScript.onerror = () => {
                console.error('Failed to load TikTok embed script');
                // Fallback for TikTok
                document.querySelectorAll('.tiktok-embed').forEach(embed => {
                    const cite = embed.getAttribute('cite');
                    if (cite) {
                        embed.innerHTML = `
                            <a href="${cite}" target="_blank" class="social-link professional-link" rel="noopener">
                                <i class="fab fa-tiktok mr-2"></i>View TikTok Video
                            </a>
                        `;
                    }
                });
            };
        }
    }

    // Initialize lazy loading for embeds
    function initLazyLoading() {
        const lazyEmbeds = document.querySelectorAll('[data-lazy="true"]');
        
        const lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const embed = entry.target;
                    lazyLoadObserver.unobserve(embed);
                    
                    // Trigger load for this specific embed
                    if (embed.classList.contains('twitter-tweet') && window.twttr) {
                        window.twttr.widgets.load(embed);
                    } else if (embed.classList.contains('instagram-media') && window.instgrm) {
                        window.instgrm.Embeds.process();
                    } else if (embed.classList.contains('fb-post') && window.FB) {
                        window.FB.XFBML.parse(embed);
                    }
                }
            });
        }, {
            rootMargin: '100px',
            threshold: 0.1
        });

        lazyEmbeds.forEach(embed => {
            lazyLoadObserver.observe(embed);
        });
    }

    // Force remove gaps from all embeds
    function forceRemoveGaps() {
        console.log('Force removing gaps from all embeds...');
        
        // Remove gaps from all embed containers
        document.querySelectorAll('.embed-container, .youtube-embed, .twitter-embed, .instagram-embed, .facebook-embed, .tiktok-embed').forEach(container => {
            container.style.margin = '0';
            container.style.padding = '0';
            container.style.border = 'none';
        });
        
        // Remove gaps from all iframes and embed elements
        document.querySelectorAll('iframe, blockquote.twitter-tweet, blockquote.instagram-media, .fb-post, .tiktok-embed').forEach(embed => {
            embed.style.margin = '0 !important';
            embed.style.padding = '0 !important';
            embed.style.border = 'none !important';
            embed.style.display = 'block !important';
        });
    }
     
    // NEW BULLETPROOF JS Filter: Converts both Jekyll links AND raw markdown text into Rich Embeds
function processAllPosts() {
    console.log('Running bulletproof embed filter...');
    const postBodies = document.querySelectorAll('.post-body');
    
    // Helper function to generate the correct HTML widget
    function getWidgetHTML(platform, caption, url) {
        platform = platform.toLowerCase();
        // Clean up stray characters from the caption (pipes, dashes, extra spaces)
        caption = caption ? caption.replace(/^[\s\|-]+/, '').trim() : ''; 
        
        const captionHtml = caption ? `<div class="tmp-embed-caption">${caption}</div>` : '';

        if (platform.includes('twitter')) {
            const cleanUrl = url.replace('x.com', 'twitter.com').split('?')[0];
            return `
            <div class="tmp-embed-block">
                <div class="tmp-embed-media">
                    <blockquote class="twitter-tweet" data-dnt="true" data-theme="light" data-align="center">
                        <a href="${cleanUrl}"></a>
                    </blockquote>
                </div>
                ${captionHtml}
            </div>`;
        } 
        else if (platform === 'youtube') {
            const videoIdMatch = url.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|\/live\/)([a-zA-Z0-9_-]{11})/);
            if (videoIdMatch) {
                return `
                <div class="tmp-embed-block">
                    <div class="tmp-embed-media responsive-iframe-container" style="padding-top: 56.25%; position: relative; max-width: 100%;">
                        <iframe src="https://www.youtube.com/embed/${videoIdMatch[1]}?rel=0&modestbranding=1" 
                            frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                        </iframe>
                    </div>
                    ${captionHtml}
                </div>`;
            }
        }
        return null;
    }

    postBodies.forEach(body => {
        // LAYER 1: Catch raw text [twitter-video|caption](url) that Jekyll failed to parse
        const rawMarkdownRegex = /\[(twitter-video|twitter|youtube|instagram|instagram-video|facebook|tiktok|telegram|linkedin|reddit)([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi;
        
        body.innerHTML = body.innerHTML.replace(rawMarkdownRegex, (match, platform, caption, url) => {
            const widget = getWidgetHTML(platform, caption, url);
            return widget ? widget : match;
        });

        // LAYER 2: Catch standard links <a href="url">twitter-video|caption</a> that Jekyll DID parse
        const links = body.querySelectorAll('a');
        links.forEach(link => {
            const text = link.textContent.trim();
            const url = link.href;
            
            const match = text.match(/^(twitter-video|twitter|youtube|instagram|instagram-video|facebook|tiktok|telegram|linkedin|reddit)(.*)$/i);
            
            if (match) {
                const platform = match[1];
                const caption = match[2];
                const widget = getWidgetHTML(platform, caption, url);
                
                if (widget) {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = widget.trim();
                    
                    if (link.parentElement.tagName === 'P' && link.parentElement.textContent.trim() === text) {
                        link.parentElement.replaceWith(wrapper.firstChild);
                    } else {
                        link.replaceWith(wrapper.firstChild);
                    }
                }
            }
        });
        
        body.classList.add('content-loaded');
    });
}
    function initialize() {
        console.log('Initializing embed system with gap removal...');
        
        // Process posts first
        processAllPosts();
        
        // Load social scripts after a short delay
        setTimeout(() => {
            loadSocialScripts();
        }, 300);
        
        // Initialize lazy loading
        setTimeout(() => {
            initLazyLoading();
        }, 500);
        
        // Force remove gaps multiple times to ensure they're gone
        setTimeout(() => {
            forceRemoveGaps();
        }, 800);
        
        // Final processing after everything is loaded
        setTimeout(() => {
            console.log('Performing final widget processing and gap removal...');
            
            // Twitter
            if (window.twttr?.widgets) {
                window.twttr.widgets.load();
                console.log('Twitter widgets processed');
            }
            
            // Instagram
            if (window.instgrm?.Embeds) {
                window.instgrm.Embeds.process();
                console.log('Instagram embeds processed');
            }
            
            // Facebook
            if (window.FB?.XFBML) {
                window.FB.XFBML.parse();
                console.log('Facebook XFBML processed');
            }
            
            // TikTok
            if (window.tiktokEmbed?.parse) {
                window.tiktokEmbed.parse();
                console.log('TikTok embeds processed');
            }
            
            // Final gap removal
            forceRemoveGaps();
            
            console.log('Embed system initialization complete - gaps should be removed');
        }, 2000);
        
        // One more gap removal for good measure
        setTimeout(forceRemoveGaps, 3000);
    }

    // Start initialization
    initialize();
});

// Enhanced Share button logic
const shareHandler = (e) => {
    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
        const postId = shareBtn.dataset.postId;
        const postHeadline = shareBtn.dataset.postHeadline;
        const postUrl = `${window.location.origin}${window.location.pathname}#post-${postId}`;
        const shareText = `Live Update: ${postHeadline}`;

        // Add visual feedback
        const originalBackground = shareBtn.style.backgroundColor;
        shareBtn.style.backgroundColor = '#10b981';
        
        setTimeout(() => {
            shareBtn.style.backgroundColor = originalBackground;
        }, 300);

        if (navigator.share) {
            navigator.share({
                title: postHeadline,
                text: shareText,
                url: postUrl
            }).catch(err => {
                console.log('Share cancelled or failed:', err);
                fallbackShare(postUrl, shareBtn);
            });
        } else {
            fallbackShare(postUrl, shareBtn);
        }
    }
};

// Fallback share method
function fallbackShare(url, shareBtn) {
    navigator.clipboard.writeText(url).then(() => {
        // Show success feedback
        const shareText = shareBtn.querySelector('span');
        const originalText = shareText.textContent;
        const originalHTML = shareBtn.innerHTML;
        
        shareBtn.innerHTML = '<i class="fas fa-check mr-2"></i><span>Copied!</span>';
        shareBtn.style.backgroundColor = '#10b981';
        
        setTimeout(() => {
            shareBtn.innerHTML = originalHTML;
            shareBtn.style.backgroundColor = '';
        }, 2000);
    }).catch(() => {
        // Final fallback
        alert(`Share this link:\n${url}`);
    });
}

// Add share event listeners with error handling
document.addEventListener('click', (e) => {
    try {
        shareHandler(e);
    } catch (error) {
        console.error('Error in share handler:', error);
    }
});

// Export functions for potential external use (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseRawContent,
        extractYouTubeId,
        isValidYouTubeId
    };
}