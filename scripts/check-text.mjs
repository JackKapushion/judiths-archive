import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

async function checkDoc(path, docName, pageNum, searchText) {
  console.log(`=== ${docName} (page ${pageNum}) ===`);
  const doc = await getDocument(path).promise;
  const page = await doc.getPage(pageNum);
  const tc = await page.getTextContent();

  console.log('Text items:');
  tc.items.slice(0, 30).forEach((item, i) => {
    if (item.str !== undefined) console.log(`  ${i}: [${item.str}]`);
  });

  let raw = '';
  for (const item of tc.items) raw += item.str || '';

  let spaced = '';
  for (const item of tc.items) {
    const t = item.str || '';
    if (t.length === 0) continue;
    if (spaced.length > 0 && !/\s/.test(spaced[spaced.length-1]) && !/\s/.test(t[0])) spaced += ' ';
    spaced += t;
  }

  console.log('');
  console.log('Raw concat (first 500):', raw.substring(0, 500));
  console.log('');
  console.log('Spaced concat (first 500):', spaced.substring(0, 500));
  console.log('');
  console.log(`Search for [${searchText}]:`);
  console.log('  In raw:', raw.toLowerCase().includes(searchText.toLowerCase()));
  console.log('  In spaced:', spaced.toLowerCase().includes(searchText.toLowerCase()));
  console.log('');
}

await checkDoc('public/documents/13e.pdf', 'Doc 13e', 3, 'Shadow of the leader');
await checkDoc('public/documents/12a.pdf', 'Doc 12a', 9, 'A Natural Leader is someone');
