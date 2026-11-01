import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { BRAND } from './plans';

/**
 * Invoice PDF dibuat sepenuhnya di server dengan pdf-lib (font standar,
 * tanpa aset eksternal) sehingga aman & ringan di Vercel.
 * Gaya visual mengikuti brutalist: blok hitam, garis tebal, aksen lime/kuning.
 */

const INK = rgb(0.039, 0.039, 0.039);
const LIME = rgb(0, 0.902, 0.463);
const SUN = rgb(1, 0.898, 0);
const PAPER = rgb(0.969, 0.969, 0.949);
const MUTED = rgb(0.42, 0.42, 0.42);
const WHITE = rgb(1, 1, 1);

const A4: [number, number] = [595.28, 841.89];

export type InvoiceData = {
  orderId: string;
  licenseKey: string;
  planName: string;
  durationDays: number;
  issuedAt: number;
  expiresAt: number;
  status: string;
  emailMasked: string;
  checksum: string;
};

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

function rule(page: PDFPage, y: number, w = 3) {
  page.drawRectangle({ x: 48, y, width: A4[0] - 96, height: w, color: INK });
}

function text(
  page: PDFPage,
  font: PDFFont,
  str: string,
  x: number,
  y: number,
  size: number,
  color = INK,
  maxWidth?: number
) {
  // potong manual agar tidak meluber (pdf-lib tanpa word-wrap otomatis)
  let s = str;
  if (maxWidth) {
    while (s.length > 1 && font.widthOfTextAtSize(s, size) > maxWidth) s = s.slice(0, -1);
    if (s !== str) s = s.slice(0, -1) + '…';
  }
  page.drawText(s, { x, y, size, font, color });
}

export async function renderInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice ${data.orderId} — ${BRAND.name}`);
  doc.setAuthor(BRAND.dev);
  doc.setSubject(`Lisensi ${data.planName}`);
  doc.setCreator(BRAND.name);
  doc.setProducer('AM Prem.ID');

  const page = doc.addPage(A4);
  const W = A4[0];
  let bold: PDFFont, regular: PDFFont, mono: PDFFont;
  try {
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
    regular = await doc.embedFont(StandardFonts.Helvetica);
    mono = await doc.embedFont(StandardFonts.CourierBold);
  } catch {
    throw new Error('Font standar tidak tersedia');
  }

  /* ── header hitam ── */
  page.drawRectangle({ x: 0, y: A4[1] - 110, width: W, height: 110, color: INK });
  // mark: kotak lime + dua petir (mengikuti maskot aplikasi)
  page.drawRectangle({ x: 48, y: A4[1] - 62, width: 34, height: 34, color: LIME, borderColor: INK, borderWidth: 2 });
  const bolt = (ox: number) =>
    page.drawSvgPath('M2 0 L10 0 L6.5 7 L11 7 L2.5 18 L5.5 9.5 L0.5 9.5 Z', {
      x: 48 + ox,
      // pdf-lib menggambar path ke ARAH BAWAH dari titik y.
      // Kotak lime: A4[1]-62 (bawah) .. A4[1]-28 (atas) → mulai dari A4[1]-38.
      y: A4[1] - 38,
      scale: 0.8,
      color: INK,
    });
  bolt(5);
  bolt(18);

  text(page, bold, BRAND.shortName, 94, A4[1] - 48, 20, WHITE);
  text(page, regular, BRAND.dev, 94, A4[1] - 64, 9, LIME);

  text(page, bold, 'INVOICE', W - 48 - bold.widthOfTextAtSize('INVOICE', 22), A4[1] - 48, 22, WHITE);
  text(page, regular, `#${data.orderId}`, W - 48 - regular.widthOfTextAtSize(`#${data.orderId}`, 9), A4[1] - 64, 9, rgb(0.6, 0.6, 0.6));

  /* ── strip kuning status ── */
  page.drawRectangle({ x: 48, y: A4[1] - 152, width: W - 96, height: 26, color: data.status === 'ACTIVE' ? LIME : rgb(1, 0.88, 0.88) });
  page.drawRectangle({ x: 48, y: A4[1] - 152, width: W - 96, height: 26, borderColor: INK, borderWidth: 2 });
  text(page, bold, data.status === 'ACTIVE' ? 'LISENSI AKTIF' : 'LISENSI DICABUT', 60, A4[1] - 145, 11, INK);
  const issued = `Diterbitkan ${fmtDate(data.issuedAt)}`;
  const issuedW = regular.widthOfTextAtSize(issued, 8);
  text(page, regular, issued, W - 48 - 12 - issuedW, A4[1] - 145, 8, INK);

  /* ── blok kunci lisensi ── */
  let y = A4[1] - 200;
  text(page, bold, 'KUNCI LISENSI', 48, y, 9, MUTED);
  y -= 22;
  page.drawRectangle({ x: 48, y, width: W - 96, height: 46, color: PAPER, borderColor: INK, borderWidth: 2 });
  text(page, mono, data.licenseKey, 48 + (W - 96 - mono.widthOfTextAtSize(data.licenseKey, 16)) / 2, y + 16, 16, INK);

  /* ── tabel rincian ── */
  y -= 42;
  rule(page, y);

  const rows: [string, string][] = [
    ['ORDER ID', data.orderId],
    ['PLAN', `${data.planName} (${data.durationDays} hari)`],
    ['PEMILIK', data.emailMasked],
    ['DITERBITKAN', fmtDate(data.issuedAt)],
    ['KADALUARSA', fmtDate(data.expiresAt)],
    ['SISA HARI', `${Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 86_400_000))} hari`],
    ['STATUS', data.status === 'ACTIVE' ? 'AKTIF' : 'DICABUT'],
    ['CHECKSUM', data.checksum],
  ];

  y -= 6;
  rows.forEach(([label, value], i) => {
    const rowH = 30;
    if (i % 2 === 0) {
      page.drawRectangle({ x: 48, y: y - rowH + 6, width: W - 96, height: rowH, color: PAPER });
    }
    text(page, bold, label, 60, y - 10, 8, MUTED);
    text(page, regular, value, 200, y - 10, 10, INK, W - 96 - 160);
    y -= rowH;
    rule(page, y + 6, 1);
  });

  /* ── total ── */
  y -= 24;
  page.drawRectangle({ x: 48, y: y - 56, width: W - 96, height: 56, color: SUN, borderColor: INK, borderWidth: 3 });
  text(page, bold, 'TOTAL', 60, y - 34, 10, INK);
  text(page, bold, 'IDR 0', W - 48 - bold.widthOfTextAtSize('IDR 0', 22) - 12, y - 40, 22, INK);
  text(page, regular, 'Termasuk pajak · tanpa biaya tersembunyi', 60, y - 48, 7, MUTED);

  /* ── catatan ── */
  y -= 92;
  rule(page, y);
  y -= 18;
  text(page, bold, 'CATATAN', 48, y, 9, MUTED);
  y -= 14;
  const notes = [
    'Invoice ini dihasilkan otomatis oleh sistem dan sah tanpa tanda tangan basah.',
    'Verifikasi keaslian lisensi kapan saja melalui halaman Cek Lisensi.',
    'Simpan berkas ini sebagai bukti kepemilikan lisensi.',
  ];
  notes.forEach((n) => {
    text(page, regular, `•  ${n}`, 48, y, 8.5, rgb(0.3, 0.3, 0.3));
    y -= 13;
  });

  /* ── footer ── */
  page.drawRectangle({ x: 0, y: 0, width: W, height: 54, color: INK });
  text(page, bold, BRAND.shortName, 48, 32, 10, LIME);
  text(page, regular, `${BRAND.dev} · ${BRAND.year}`, 48, 20, 8, rgb(0.6, 0.6, 0.6));
  const right = `Dicetak ${new Date().toLocaleDateString('id-ID')}`;
  text(page, regular, right, W - 48 - regular.widthOfTextAtSize(right, 8), 26, 8, rgb(0.6, 0.6, 0.6));

  return doc.save();
}
