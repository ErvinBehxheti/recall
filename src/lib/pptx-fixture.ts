import JSZip from "jszip";

type FixtureSlide = { file: number; paragraphs: string[]; notes?: string[] };

const para = (text: string) => `<a:p><a:r><a:t>${text}</a:t></a:r></a:p>`;

/** Builds a minimal PPTX. `order` lists slide file numbers in presentation order. */
export async function buildPptx(slides: FixtureSlide[], order = slides.map((s) => s.file)): Promise<Uint8Array> {
  const zip = new JSZip();
  const rels = slides
    .map(
      (s) =>
        `<Relationship Id="rId${s.file + 100}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.file}.xml"/>`,
    )
    .join("");
  zip.file("ppt/_rels/presentation.xml.rels", `<?xml version="1.0"?><Relationships>${rels}</Relationships>`);
  const ids = order.map((file, i) => `<p:sldId id="${256 + i}" r:id="rId${file + 100}"/>`).join("");
  zip.file("ppt/presentation.xml", `<?xml version="1.0"?><p:presentation><p:sldIdLst>${ids}</p:sldIdLst></p:presentation>`);
  for (const s of slides) {
    zip.file(`ppt/slides/slide${s.file}.xml`, `<p:sld><p:txBody>${s.paragraphs.map(para).join("")}</p:txBody></p:sld>`);
    if (s.notes) {
      zip.file(
        `ppt/slides/_rels/slide${s.file}.xml.rels`,
        `<Relationships><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${s.file + 40}.xml"/></Relationships>`,
      );
      zip.file(
        `ppt/notesSlides/notesSlide${s.file + 40}.xml`,
        `<p:notes>${s.notes.map(para).join("")}<a:p><a:fld id="x" type="slidenum"><a:t>${s.file}</a:t></a:fld></a:p></p:notes>`,
      );
    }
  }
  return zip.generateAsync({ type: "uint8array" });
}
