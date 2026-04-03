const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '_posts');
const outputDir = path.join(__dirname, 'public/archive-data');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

let allPosts = [];

fs.readdirSync(postsDir).forEach(file => {
    if (!file.endsWith('.md')) return;
    
    const fileData = fs.readFileSync(path.join(postsDir, file), 'utf8');
    const match = fileData.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)([\s\S]*)$/);
    
    if (match) {
        const frontmatterRaw = match[1];
        const rawContent = match[2].trim(); 
        
        const post = { id: file.replace('.md', ''), content: rawContent };
        
        // --- ULTIMATE HEADLINE SANITIZER ---
        let headline = '';
        const lines = frontmatterRaw.split('\n');
        let inHeadline = false;
        let headlineText = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // 1. Detect the start of the headline
            if (!inHeadline && line.startsWith('headline:')) {
                inHeadline = true;
                const val = line.replace('headline:', '').trim();
                
                // If it is a normal single-line headline, grab it and stop
                if (val !== '>' && val !== '>-' && val !== '|' && val !== '|-') {
                    if (val) headlineText.push(val);
                    break;
                }
                continue; // It is multiline! Move to the next line.
            }

            // 2. We are inside the multiline headline
            if (inHeadline) {
                // BULLETPROOF CHECK: Stop ONLY if we see the next specific YAML category
                if (/^(author_name|timestamp|tags|likes|views|---):?\s*/.test(line)) {
                    break;
                }

                // Otherwise, it belongs to the headline! Add it.
                if (line.trim() !== '') {
                    headlineText.push(line.trim());
                }
            }
        }

        // Stitch it all together
        headline = headlineText.join(' ').trim();
        
        // Clean up quotes, HTML, and Unicode
        headline = headline.replace(/^['"]|['"]$/g, ''); 
        headline = headline.replace(/<[^>]*>?/gm, '');   
        headline = headline.replace(/\\U([0-9A-Fa-f]{8})/g, (match, hex) => {
            try { return String.fromCodePoint(parseInt(hex, 16)); } 
            catch(e) { return match; }
        });
        
        post.headline = headline;
        // -----------------------------------

        const getMeta = (key) => {
            const regex = new RegExp(`^${key}:\\s*['"]?(.*?)['"]?\\s*$`, 'm');
            const result = frontmatterRaw.match(regex);
            return result ? result[1].trim() : null;
        };

        post.author_name = getMeta('author_name') || 'TMP Live Team';
        post.timestamp = getMeta('timestamp') || new Date().toISOString();
        post.likes = parseInt(getMeta('likes')) || 0;
        post.views = parseInt(getMeta('views')) || 0;
        
        const tagsMatch = frontmatterRaw.match(/tags:\n((?:\s+- .*\n?)+)/);
        if (tagsMatch) {
            post.tags = tagsMatch[1].split('\n').filter(t => t.trim().startsWith('-')).map(t => t.replace('-', '').trim());
        } else {
            post.tags = [];
        }

        allPosts.push(post);
    }
});

allPosts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

const CHUNK_SIZE = 100;
let chunkIndex = 1;

for (let i = 0; i < allPosts.length; i += CHUNK_SIZE) {
    let chunk = allPosts.slice(i, i + CHUNK_SIZE);
    chunk.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const fileName = `archive-${String(chunkIndex).padStart(3, '0')}.json`;
    fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(chunk, null, 2));
    
    chunkIndex++;
}

console.log(`\n✅ Migration complete! Bulletproof headline parsing applied. Processed ${allPosts.length} posts.`);