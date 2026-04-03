// A single, smart script that injects the correct header based on the current page.
function renderArchiveHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) return;

    // The link for the logo now points to your main website.
    const archiveHeaderHTML = `
        <header class="header">
            <div class="header-content">
                <div class="header-left">
                </div>
                <div class="header-center">
                    <a href="https://www.tmpnews.com/" class="logo">
                        <svg class="vector-animation" viewBox="0 0 200 200" aria-hidden="true">
                            <rect x="50" y="50" width="100" height="100" class="square"/>
                            <text x="50%" y="50%" text-anchor="middle" dy=".3em" class="tmp-text">TMP</text>
                            <circle cx="100" cy="100" r="80" fill="none" stroke-width="2" class="rotating-circle"/>
                        </svg>                        
                        <span class="logo-text">The Muslim Post</span>
                    </a>
                </div>
                <div class="header-right">
                </div>
            </div>
        </header>
    `;
    headerPlaceholder.innerHTML = archiveHeaderHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    renderArchiveHeader();
});