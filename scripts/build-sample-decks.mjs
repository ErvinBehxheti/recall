// Prints the HTML sample decks in samples/decks to PDFs in samples/pdf.
import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";

const SLUGS = ["photosynthesis", "ww1-causes"];

await mkdir("samples/pdf", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

for (const slug of SLUGS) {
  const out = `samples/pdf/${slug}.pdf`;
  await page.goto(pathToFileURL(path.resolve(`samples/decks/${slug}.html`)).href);
  await page.pdf({ path: out, width: "1280px", height: "720px", printBackground: true });
  const pages = (await PDFDocument.load(await readFile(out))).getPageCount();
  console.log(`built ${out} (${pages} pages)`);
}

await browser.close();
