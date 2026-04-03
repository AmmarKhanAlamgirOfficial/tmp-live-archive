const fs = require('fs');
const path = require('path');

// Define the path to your posts directory
const postsDir = path.join(__dirname, '_posts');

// 1. Regex for Instagram
const instaRegex = /\[(instagram-video|instagram)(?:\|([^\]]*))?\]\((https?:\/\/[^\s)]+)\)/gi;

// 2. Regex for YouTube
const ytRegex = /\[(youtube)(?:\|([^\]]*))?\]\((https?:\/\/[^\s)]+)\)/gi;

function processDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`❌ Directory not found: ${dir}`);
        return 0;
    }

    const files = fs.readdirSync(dir);
    let updatedFilesCount = 0;

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        // If it's a folder, search inside it recursively
        if (stat.isDirectory()) {
            updatedFilesCount += processDirectory(filePath);
        } 
        // If it's a Markdown file, process it
        else if (file.endsWith('.md')) {
            const originalContent = fs.readFileSync(filePath, 'utf8');
            let newContent = originalContent;

            // --- PROCESS INSTAGRAM ---
            newContent = newContent.replace(instaRegex, (match, type, caption, url) => {
                const cleanCaption = caption ? caption.trim() : '';
                // Clean URL (removes query parameters for a cleaner embed)
                const cleanUrl = url.split('?')[0];

                let html = `<div class="embed-container">\n`;
                html += `<blockquote class="instagram-media" data-instgrm-permalink="${cleanUrl}" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">\n`;
                html += `  <a href="${cleanUrl}"></a>\n`;
                html += `</blockquote>\n`;
                
                if (cleanCaption) {
                    html += `<div class="embed-caption">${cleanCaption}&nbsp;</div>\n`;
                }
                html += `</div>`;
                return html;
            });

            // --- PROCESS YOUTUBE ---
            newContent = newContent.replace(ytRegex, (match, type, caption, url) => {
                const cleanCaption = caption ? caption.trim() : '';
                
                // Extract the 11-character YouTube Video ID
                const videoIdMatch = url.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/|\/v\/|\/live\/)([a-zA-Z0-9_-]{11})/);
                
                // If it can't find a valid ID, leave the original text to prevent breaking
                if (!videoIdMatch) return match; 

                const videoId = videoIdMatch[1];

                let html = `<div class="embed-container">\n`;
                html += `<div class="responsive-iframe-container">\n`;
                html += `  <iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" frameborder="0" allowfullscreen></iframe>\n`;
                html += `</div>\n`;
                
                if (cleanCaption) {
                    html += `<div class="embed-caption">${cleanCaption}&nbsp;</div>\n`;
                }
                html += `</div>`;
                return html;
            });

            // Only rewrite the file if changes were actually made
            if (originalContent !== newContent) {
                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`✅ Updated: ${file}`);
                updatedFilesCount++;
            }
        }
    }
    
    return updatedFilesCount;
}

console.log('🔍 Scanning _posts/ for Instagram and YouTube embeds...\n');
const totalUpdated = processDirectory(postsDir);
console.log(`\n🎉 Finished! Successfully updated ${totalUpdated} files.`);