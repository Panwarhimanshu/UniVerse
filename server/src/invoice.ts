import { getSettings } from './content.js';
import { stateOfGstin } from './kyc.js';
import { drawSignature, money2, NAVY, SOFT, Writer } from './pdf.js';

/* Withdrawals are built from the commission entries a partner selects. Commission sits in the wallet at full value;
   TDS is deducted on the commission entries at withdrawal. "With GST", the partner issues a tax invoice to UniVerse
   with one line per student-service commission, and UniVerse pays GST on top:
     paid = entries + GST - TDS (wallet debited by the entries' value). */

export interface WithdrawLine { id: string; desc: string; sub: string; amount: number; commission: boolean }

export interface WithdrawCalc {
  amount: number; // value of the selected entries (taken from the wallet)
  tds: number; tdsRate: number;
  gstRate: number; cgst: number; sgst: number; igst: number; gst: number; interState: boolean;
  payable: number; // what reaches the partner
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcWithdrawal(lines: WithdrawLine[], supplierGstin?: string): WithdrawCalc {
  const s = getSettings();
  const amount = lines.reduce((x, l) => x + l.amount, 0);
  const commissionPart = lines.filter((l) => l.commission).reduce((x, l) => x + l.amount, 0);
  const tds = Math.round((commissionPart * s.tdsRate) / 100);
  if (!supplierGstin) {
    return { amount, tds, tdsRate: s.tdsRate, gstRate: 0, cgst: 0, sgst: 0, igst: 0, gst: 0, interState: false, payable: amount - tds };
  }
  const companyState = s.company.gstin ? s.company.gstin.slice(0, 2) : s.company.stateCode;
  const interState = supplierGstin.slice(0, 2) !== companyState;
  const gst = r2((amount * s.gstRate) / 100);
  const half = r2(gst / 2);
  return {
    amount, tds, tdsRate: s.tdsRate, gstRate: s.gstRate, interState, gst,
    cgst: interState ? 0 : half, sgst: interState ? 0 : r2(gst - half), igst: interState ? gst : 0,
    payable: r2(amount + gst - tds),
  };
}

export interface InvoiceParty { legalName: string; gstin: string; address: string; state: string; pan?: string }

export async function buildInvoice(o: {
  number: string; date: Date; supplier: InvoiceParty; calc: WithdrawCalc; lines: WithdrawLine[]; bank: string;
  signature?: { path: string; name: string; at: Date };
}) {
  const s = getSettings();
  const c = s.company;
  const w = await Writer.create(`Tax invoice ${o.number} · ${o.supplier.legalName}`);
  w.text('TAX INVOICE', { size: 17, bold: true, color: NAVY, align: 'center', gap: 2 });
  w.text('Original for recipient · commission withdrawal from the UniVerse partner wallet', { size: 8.5, color: SOFT, align: 'center', gap: 12 });

  w.text(o.supplier.legalName, { size: 12, bold: true, color: NAVY, gap: 1 });
  w.text(`${o.supplier.address}${o.supplier.state ? `, ${o.supplier.state}` : ''}`, { size: 9.2, gap: 1 });
  w.text(`GSTIN: ${o.supplier.gstin}   State: ${stateOfGstin(o.supplier.gstin)} (${o.supplier.gstin.slice(0, 2)})${o.supplier.pan ? `   PAN: ${o.supplier.pan}` : ''}`, { size: 9.2, gap: 8 });

  w.table(['Invoice no.', 'Invoice date', 'Place of supply', 'Reverse charge'],
    [[o.number, o.date.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }), `${c.state} (${c.gstin ? c.gstin.slice(0, 2) : c.stateCode})`, 'No']], [0.25, 0.25, 0.3, 0.2]);

  w.text('Bill to', { size: 9, bold: true, color: SOFT, gap: 1 });
  w.text(c.legalName, { size: 10.5, bold: true, color: NAVY, gap: 1 });
  w.text(`${c.address || ''}${c.state ? `, ${c.state}` : ''}`, { size: 9.2, gap: 1 });
  w.text(`GSTIN: ${c.gstin || 'to be added in Settings'}${c.pan ? `   PAN: ${c.pan}` : ''}`, { size: 9.2, gap: 10 });

  const k = o.calc;
  w.table(['#', 'Description: student service commissions', 'SAC', 'Amount'],
    o.lines.map((l, i) => [String(i + 1), `${l.desc} (${l.sub})`, s.sac, money2(l.amount)]),
    [0.06, 0.62, 0.12, 0.2], { alignRight: [3] });
  const sum: string[][] = [['Taxable value', money2(k.amount)]];
  if (k.interState) sum.push([`IGST @ ${k.gstRate}%`, money2(k.igst)]);
  else sum.push([`CGST @ ${k.gstRate / 2}%`, money2(k.cgst)], [`SGST @ ${k.gstRate / 2}%`, money2(k.sgst)]);
  sum.push(['Invoice total', money2(k.amount + k.gst)]);
  sum.push([`Less: TDS deducted by recipient @ ${k.tdsRate}% (section 393, Income-tax Act 2025)`, `- ${money2(k.tds)}`]);
  sum.push(['Net amount payable', money2(k.payable)]);
  w.table(['', 'Amount'], sum, [0.75, 0.25], { alignRight: [1] });

  w.text(`Pay to: ${o.bank}`, { size: 9.2, gap: 4 });
  w.text('Declaration: we declare that this invoice shows the actual value of the services described and that all particulars are true and correct. Tax on this supply is not payable under reverse charge.', { size: 8.6, color: SOFT, gap: 18 });

  w.ensure(110);
  w.text(`For ${o.supplier.legalName}`, { size: 9.5, bold: true, color: NAVY, gap: 2 });
  if (o.signature) {
    drawSignature(w.page, o.signature.path, w.left, w.y - 52, 150, 50);
    w.space(56);
    w.text(`${o.signature.name} · Authorised signatory`, { size: 9, gap: 1 });
    w.text(`Signed electronically on ${o.signature.at.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })} IST on the UniVerse Platform`, { size: 7.8, color: SOFT });
  } else {
    w.space(40);
    w.text('PREVIEW: not signed', { size: 10, bold: true, color: SOFT });
  }
  return w.save();
}
