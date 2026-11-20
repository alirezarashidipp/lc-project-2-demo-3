import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import workerPath from "tesseract.js/dist/worker.min.js?url";
import corePath from "tesseract.js-core/tesseract-core-lstm.wasm.js?url";
import { classify } from "./examination.js";
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
export async function readPackage(files, status) {
  let ocr;
  const result = [];
  try {
    for (const file of files) {
      let task,
        doc,
        pages = [],
        usedOCR = false;
      try {
        status("Reading " + file.name);
        task = pdfjs.getDocument({
          data: new Uint8Array(await file.arrayBuffer()),
          useSystemFonts: true,
          isEvalSupported: false,
        });
        doc = await task.promise;
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n),
            content = await page.getTextContent();
          let text = content.items
            .map((i) => i.str + (i.hasEOL ? "\n" : " "))
            .join("");
          if (text.trim().length < 20) {
            status("Reading scanned page with OCR · " + file.name);
            if (!ocr) {
              const { createWorker } = await import("tesseract.js");
              ocr = await createWorker("eng", 1, {
                workerPath: new URL(workerPath, location.href).href,
                corePath: new URL(corePath, location.href).href,
                langPath: location.origin + "/ocr",
                gzip: false,
              });
            }
            const viewport = page.getViewport({ scale: 2 }),
              canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvas, viewport }).promise;
            text = (await ocr.recognize(canvas)).data.text;
            usedOCR = true;
          }
          pages.push(text);
        }
        result.push({
          name: file.name,
          text: pages.join("\n"),
          type: classify(pages.join("\n")),
          method: usedOCR ? "OCR" : "PDF text",
        });
      } catch (e) {
        result.push({
          name: file.name,
          type: null,
          text: "",
          error: e.message,
          method: "Read error",
        });
      } finally {
        await task?.destroy();
      }
    }
  } finally {
    await ocr?.terminate();
  }
  return result;
}
