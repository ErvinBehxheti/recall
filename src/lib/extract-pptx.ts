import JSZip from "jszip";

export type SlideText = { number: number; text: string; notes: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()];
    const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return String.fromCodePoint(code);
  });
}

const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

export function xmlToText(xml: string): string {
  const cleaned = xml.replace(/<a:fld\b[\s\S]*?<\/a:fld>/g, "").replace(/<a:br\s*\/>/g, "<a:t> </a:t>");
  const paragraphs = cleaned.match(/<a:p\b[\s\S]*?<\/a:p>/g) ?? [];
  return paragraphs
    .map((p) => [...p.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(""))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Slide paths in presentation order. Files keep their old names when slides are reordered in PowerPoint. */
async function slidePaths(zip: JSZip): Promise<string[]> {
  const numeric = Object.keys(zip.files)
    .map((path) => ({ path, match: /^ppt\/slides\/slide(\d+)\.xml$/.exec(path) }))
    .filter((x): x is { path: string; match: RegExpExecArray } => x.match !== null)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((x) => x.path);

  const pres = await zip.file("ppt/presentation.xml")?.async("string");
  const rels = await zip.file("ppt/_rels/presentation.xml.rels")?.async("string");
  if (!pres || !rels) return numeric;

  const targets = new Map<string, string>();
  for (const [tag] of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(tag, "Id");
    const target = attr(tag, "Target");
    if (id && target) targets.set(id, `ppt/${target.replace(/^\/?ppt\//, "").replace(/^\.\//, "")}`);
  }
  const ordered = [...pres.matchAll(/<p:sldId\b[^>]*>/g)]
    .map(([tag]) => targets.get(attr(tag, "r:id") ?? ""))
    .filter((p): p is string => !!p && zip.file(p) !== null);
  return ordered.length ? ordered : numeric;
}

async function readNotes(zip: JSZip, slidePath: string): Promise<string> {
  const relsPath = slidePath.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels");
  const rels = await zip.file(relsPath)?.async("string");
  const target = rels && /Target="([^"]*notesSlide\d+\.xml)"/.exec(rels)?.[1];
  if (!target) return "";
  const notes = await zip.file(`ppt/${target.replace(/^(\.\.\/)+/, "")}`)?.async("string");
  return notes ? xmlToText(notes).replace(/\n/g, " ") : "";
}

export async function extractPptx(data: Uint8Array | ArrayBuffer): Promise<SlideText[]> {
  const zip = await JSZip.loadAsync(data);
  const paths = await slidePaths(zip);
  const slides: SlideText[] = [];
  for (const [i, path] of paths.entries()) {
    const xml = await zip.file(path)!.async("string");
    slides.push({ number: i + 1, text: xmlToText(xml), notes: await readNotes(zip, path) });
  }
  return slides;
}

export function slidesToPrompt(slides: SlideText[]): string {
  return slides
    .map((s) => `Slide ${s.number}:\n${s.text || "(no text)"}${s.notes ? `\nSpeaker notes: ${s.notes}` : ""}`)
    .join("\n\n");
}

export function hasReadableText(slides: SlideText[]): boolean {
  return slides.some((s) => /\p{L}{2,}/u.test(`${s.text} ${s.notes}`));
}
