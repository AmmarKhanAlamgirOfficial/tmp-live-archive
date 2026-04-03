const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '_posts');

function cleanHtmlContent(content) {
    if (!content) return '';
    return content
        .replace(/&nbsp;/gi, ' ')  
        .replace(/<div>\s*<br\s*\/?>\s*<\/div>/gi, '\n\n') 
        .replace(/<div[^>]*>/gi, '\n\n')           
        .replace(/<\/div>/gi, '')                 
        .replace(/<br\s*\/?>/gi, '\n')             
        .replace(/\n{3,}/g, '\n\n')                
        .trim();
}

let cleanedCount = 0;
let skippedCleanCount = 0;
let skippedErrorCount = 0;

fs.readdirSync(postsDir).forEach(file => {
    if (!file.endsWith('.md')) return;
    
    const filePath = path.join(postsDir, file);
    const fileData = fs.readFileSync(filePath, 'utf8');

    // FIXED: \r?\n handles both Windows (CRLF) and Linux (LF) line endings safely
    const match = fileData.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/);
    
    if (match) {
        const frontmatter = match[1];
        const content = match[2];
        
        const cleanedContent = cleanHtmlContent(content);
        
        // Only rewrite the file if changes were actually made
        if (content !== cleanedContent) {
            fs.writeFileSync(filePath, frontmatter + cleanedContent, 'utf8');
            console.log(`✅ Cleaned: ${file}`);
            cleanedCount++;
        } else {
            console.log(`⏩ Skipped (Already clean): ${file}`);
            skippedCleanCount++;
        }
    } else {
        console.log(`❌ Skipped (Could not find YAML frontmatter): ${file}`);
        skippedErrorCount++;
    }
});

console.log("\n--- Summary ---");
console.log(`Successfully cleaned: ${cleanedCount}`);
console.log(`Skipped (already clean): ${skippedCleanCount}`);
console.log(`Skipped (missing/invalid frontmatter): ${skippedErrorCount}`);