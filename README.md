# Trade examination workspace

Clone with Git LFS installed to retrieve the bundled language model. If you already cloned the repository, run `git lfs pull` in the project folder.

Run `npm install` once and `npm start` to launch the workspace. Open the local URL printed in the terminal. The preferred port is 5182. If it is in use, Vite prints the next available port. For a static release use `npm run build` and serve the dist directory.

Download a case ZIP from Case library and manually upload it in Document intake. Each synthetic package contains five PDFs, including a scanned packing list. For the textiles case, download the separate legible replacement and use Add or replace evidence on the report. Print / Save PDF exports the current examination.

PDF.js reads text pages. Tesseract recognises image-only pages using bundled English language data. Five rubric checks examine the sample document templates. SmolLM2 reviews the extracted text and findings locally with wllama. The model (about 258 MiB) ships in public/model and loads on the first AI run. All document processing uses the browser. The current examination lasts for the browser session and the examiner queue is simulated. The deadline uses the manual upload date and a Monday-to-Friday demo calendar.

Model: HuggingFaceTB/SmolLM2-360M-Instruct, GGUF Q4_K_M from bartowski/SmolLM2-360M-Instruct-GGUF (Apache 2.0). OCR language data: tesseract-ocr/tessdata_fast (Apache 2.0). Icons: Lucide (ISC). Harbour photograph: Unsplash, photo-1578575437130-527eed3abbec.

With the app running, set APP_URL to its URL and run npm test. Set CHROME_BIN to a Chromium executable or install the Playwright chromium browser first.
