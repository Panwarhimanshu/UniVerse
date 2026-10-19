import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

/* A small flowing-text PDF writer (A4) for agreements and invoices. Standard fonts only, so text is kept to
   WinAnsi characters: "Rs." instead of the rupee sign, plain quotes and dashes. */

export const NAVY = rgb(0.086, 0.204, 0.482);
export const INK = rgb(0.2, 0.28, 0.37);
export const SOFT = rgb(0.42, 0.49, 0.56);
export const LINE = rgb(0.86, 0.89, 0.93);
const W = 595.28, H = 841.89, M = 56;

/** Replaces characters the standard fonts can't draw */
export const plain = (s: string) => String(s ?? '')
  .replace(/₹\s?/g, 'Rs. ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/•/g, '*')
  .replace(/…/g, '...').replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');

export const money = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
export const money2 = (n: number) => `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export class Writer {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  footer = '';

  static async create(footer = '') {
    const w = new Writer();
    w.doc = await PDFDocument.create();
    w.font = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    w.footer = plain(footer);
    w.newPage();
    return w;
  }

  newPage() {
    this.page = this.doc.addPage([W, H]);
    this.y = H - M;
  }

  ensure(h: number) {
    if (this.y - h < M + 20) this.newPage();
  }

  get width() { return W - 2 * M; }
  get left() { return M; }

  wrap(text: string, size: number, font: PDFFont, width = this.width) {
    const out: string[] = [];
    for (const para of plain(text).split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) line = next;
        else {
          if (line) out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    return out;
  }

  text(text: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number; gap?: number; align?: 'left' | 'center' | 'right' } = {}) {
    const size = o.size ?? 10;
    const font = o.bold ? this.bold : this.font;
    const indent = o.indent ?? 0;
    const lh = size * 1.42;
    for (const line of this.wrap(text, size, font, this.width - indent)) {
      this.ensure(lh);
      const tw = font.widthOfTextAtSize(line, size);
      const x = o.align === 'center' ? (W - tw) / 2 : o.align === 'right' ? W - M - tw : M + indent;
      this.page.drawText(line, { x, y: this.y - size, size, font, color: o.color ?? INK });
      this.y -= lh;
    }
    this.y -= o.gap ?? 4;
  }

  heading(text: string) {
    this.ensure(40);
    this.y -= 6;
    this.text(text, { size: 11.5, bold: true, color: NAVY, gap: 3 });
  }

  /** "1.1  text" with a hanging indent */
  clause(num: string, text: string) {
    const size = 9.6;
    const lines = this.wrap(text, size, this.font, this.width - 26);
    const lh = size * 1.42;
    lines.forEach((line, i) => {
      this.ensure(lh);
      if (i === 0) this.page.drawText(num, { x: M, y: this.y - size, size, font: this.bold, color: NAVY });
      this.page.drawText(line, { x: M + 26, y: this.y - size, size, font: this.font, color: INK });
      this.y -= lh;
    });
    this.y -= 3;
  }

  rule(gap = 8) {
    this.ensure(gap * 2);
    this.y -= gap;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: W - M, y: this.y }, thickness: 0.7, color: LINE });
    this.y -= gap;
  }

  /** Simple table: column widths as fractions of the content width */
  table(head: string[], rows: string[][], cols: number[], o: { size?: number; alignRight?: number[] } = {}) {
    const size = o.size ?? 9;
    const widths = cols.map((c) => c * this.width);
    const drawRow = (cells: string[], isHead: boolean) => {
      const font = isHead ? this.bold : this.font;
      const wrapped = cells.map((c, i) => this.wrap(c, size, font, widths[i] - 8));
      const h = Math.max(...wrapped.map((l) => l.length)) * size * 1.35 + 8;
      this.ensure(h);
      if (isHead) this.page.drawRectangle({ x: M, y: this.y - h, width: this.width, height: h, color: rgb(0.93, 0.95, 0.98) });
      let x = M;
      wrapped.forEach((lines, i) => {
        lines.forEach((line, j) => {
          const tw = font.widthOfTextAtSize(line, size);
          const tx = o.alignRight?.includes(i) ? x + widths[i] - 4 - tw : x + 4;
          this.page.drawText(line, { x: tx, y: this.y - 4 - size - j * size * 1.35, size, font, color: isHead ? NAVY : INK });
        });
        x += widths[i];
      });
      this.y -= h;
      this.page.drawLine({ start: { x: M, y: this.y }, end: { x: W - M, y: this.y }, thickness: 0.5, color: LINE });
    };
    drawRow(head, true);
    rows.forEach((r) => drawRow(r, false));
    this.y -= 8;
  }

  space(h: number) { this.y -= h; }

  async save() {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      const label = `${this.footer ? `${this.footer}   ` : ''}Page ${i + 1} of ${pages.length}`;
      p.drawText(label, { x: M, y: 28, size: 7.5, font: this.font, color: SOFT });
    });
    return Buffer.from(await this.doc.save());
  }
}

/* ---------- signatures ---------- */
/** Signature strokes from the app or website: an SVG path of M/L commands in a 600×200 box */
export const SIG_RE = /^[ML0-9.,\s-]{10,30000}$/;
export const validSignature = (s: unknown): s is string => typeof s === 'string' && SIG_RE.test(s) && /L/.test(s);

/** Draws a signature path scaled into a box (pdf-lib's SVG paths use a top-left origin at x, y) */
export function drawSignature(page: PDFPage, path: string, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / 600, h / 200);
  page.drawSvgPath(path, { x, y: y + h, scale, borderColor: NAVY, borderWidth: 1.6 / scale, color: undefined });
}
