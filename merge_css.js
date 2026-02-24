const fs = require('fs');
const v2CSS = fs.readFileSync('v2_styles.css', 'utf-8');
const v3CSS = fs.readFileSync('src/app/globals.css', 'utf-8');

const rootIndex = v2CSS.indexOf(':root {');
let v2Base = '';

if (rootIndex !== -1) {
    v2Base = v2CSS.substring(0, rootIndex);
} else {
    // If we can't find :root, just log error
    console.error('Could not find :root in v2_styles.css');
    process.exit(1);
}

// Remove any existing :root from the top of V3 CSS to prevent duplication if we accidentally prepend too much
// However, V3 CSS starts with :root { so prepending is safe.
const newV3CSS = v2Base + v3CSS;
fs.writeFileSync('src/app/globals.css', newV3CSS);

console.log('Successfully injected Tailwind base layer to globals.css');
