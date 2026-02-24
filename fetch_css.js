const https = require('https');
const fs = require('fs');

https.get('https://trackingequipmentv2-2txj.vercel.app/', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const matches = data.match(/href="([^"]+\.css[^"]*)"/g);
        if (matches) {
            matches.forEach(m => {
                const url = m.slice(6, -1);
                const fullUrl = url.startsWith('http') ? url : `https://trackingequipmentv2-2txj.vercel.app${url.startsWith('/') ? '' : '/'}${url}`;
                console.log(`Fetching: ${fullUrl}`);
                https.get(fullUrl, (cssRes) => {
                    let cssData = '';
                    cssRes.on('data', (c) => cssData += c);
                    cssRes.on('end', () => {
                        fs.appendFileSync('v2_styles.css', `/* From ${fullUrl} */\n${cssData}\n\n`);
                        console.log(`Saved CSS from ${fullUrl}`);
                    });
                });
            });
        } else {
            console.log('No CSS files found');
        }
    });
}).on('error', (err) => {
    console.error(err);
});
