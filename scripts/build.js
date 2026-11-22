import { mkdir, copyFile } from 'node:fs/promises';

const destination = new URL('../_site/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ['index.html', 'style.css', 'app.js', 'geometry.js']) {
  await copyFile(new URL(`../${name}`, import.meta.url), new URL(name, destination));
}
console.log('Static app ready in _site/');
