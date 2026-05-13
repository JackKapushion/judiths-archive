import { pdfjs } from 'react-pdf'

// PDF.js needs a Web Worker to parse PDFs in a background thread so the UI
// doesn't freeze while loading large files. This tells Vite to include the
// worker as a separate asset in the build and gives the app the correct URL
// to load it from at runtime. The `import.meta.url` pattern is how Vite
// resolves the path to the worker file during both dev and production builds.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
