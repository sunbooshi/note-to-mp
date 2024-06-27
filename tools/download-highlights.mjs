import fs from 'node:fs';
import https from 'node:https';

const resPath = 'highlights';
fs.mkdirSync(resPath, { recursive: true });

fs.readFile('highlights.json', 'utf8', (err, data) => {
    if (err) {
        console.error(`Error reading file: ${err}`);
        return;
    }

    const cssFiles = JSON.parse(data);
    for (let file of cssFiles) {
        downloadFile(file.url, `${resPath}/${file.name}.css`);
    }
});

function downloadFile(url, dest) {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => file.close());
    }).on('error', (err) => {
        fs.unlink(dest);
        console.error(`Error downloading file: ${err}`);
    });
}
