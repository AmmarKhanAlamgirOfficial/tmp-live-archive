const fs = require('fs');
const path = require('path');

// Define the path to your posts directory
const postsDir = path.join(__dirname, '_posts');

// The regular expression to find [twitter-video|Caption](url) or [twitter|Caption](url)
// It safely extracts the platform, the caption, and the URL.
const regex = /\[(twitter-video|twitter)(?:\|([^\]]*))?\]\((https?:\/\/[^\s)]+)\)/gi;

function processDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`❌ Directory not found: ${dir}`);
        console.error(`Make sure you are running this script from the root folder of your project.`);
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

            newContent = newContent.replace(regex, (match, type, caption, url) => {
                // 1. Convert x.com to twitter.com safely
                const cleanUrl = url.replace(/https?:\/\/x\.com/i, 'https://twitter.com');
                
                // 2. Clean up the caption
                const cleanCaption = caption ? caption.trim() : '';

                // 3. Build the new HTML layout
                let html = `<div class="embed-container">\n`;
                html += `<blockquote class="twitter-tweet" data-dnt="true" data-theme="light"><a href="${cleanUrl}"></a></blockquote>\n`;
                
                // Only add the caption div if a caption actually exists
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

console.log('🔍 Scanning _posts/ for Twitter embeds...\n');
const totalUpdated = processDirectory(postsDir);
console.log(`\n🎉 Finished! Successfully updated ${totalUpdated} files.`);