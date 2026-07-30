import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const doc = await getDocument('public/documents/12a.pdf').promise;
const page = await doc.getPage(9);
const tc = await page.getTextContent();

const withStr = tc.items.filter(i => i.str !== undefined);
const withoutStr = tc.items.filter(i => i.str === undefined);
console.log('Items with str:', withStr.length);
console.log('Items without str:', withoutStr.length);
if (withoutStr.length > 0) {
  console.log('Non-str items (first 5):', JSON.stringify(withoutStr.slice(0, 5)));
}

// Show if text contains "A Natural Leader" with our concat method
let spaced = '';
for (const item of tc.items) {
  const t = item.str || '';
  if (t.length === 0) continue;
  if (spaced.length > 0 && !/\s/.test(spaced[spaced.length - 1]) && !/\s/.test(t[0])) spaced += ' ';
  spaced += t;
}

const query = 'A Natural Leader is someone who understands the responsibility';
const idx = spaced.toLowerCase().indexOf(query.toLowerCase());
console.log('\nFull text around match:');
if (idx >= 0) {
  console.log(spaced.substring(Math.max(0, idx - 50), idx + query.length + 50));
} else {
  console.log('NOT FOUND');
  // Show last 200 chars to see if it's near the end
  console.log('\nLast 300 chars of page text:');
  console.log(spaced.substring(spaced.length - 300));
}
