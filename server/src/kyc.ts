import multer from 'multer';

/* KYC for partners: PAN for individuals; GSTIN and/or Udyam (MSME) registration for entities. */

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const UDYAM_RE = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
export const PINCODE_RE = /^[1-9]\d{5}$/;
export const AADHAAR_RE = /^[2-9]\d{11}$/;

/** Aadhaar check digit (Verhoeff) */
const VD = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]];
const VP = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]];
export function aadhaarValid(a: string) {
  if (!AADHAAR_RE.test(a)) return false;
  let c = 0;
  a.split('').reverse().forEach((d, i) => { c = VD[c][VP[i % 8][Number(d)]]; });
  return c === 0;
}

/** GSTIN check digit (mod-36 checksum used by the GST network) */
export function gstinValid(g: string) {
  const v = g.trim().toUpperCase();
  if (!GSTIN_RE.test(v)) return false;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const p = chars.indexOf(v[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return chars[(36 - (sum % 36)) % 36] === v[14];
}

/** GST state codes (first two digits of a GSTIN) */
export const GST_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland',
  '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory',
};
export const INDIAN_STATES = [...new Set(Object.values(GST_STATES))].filter((x) => x !== 'Other Territory').sort();
export const stateOfGstin = (g: string) => GST_STATES[g.slice(0, 2)] ?? '';

export const ENTITY_TYPES = ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'Trust / Society', 'Other'];

/** Certificate uploads: PDF or photo. Up to three go in one request and Vercel caps a request at 4.5 MB, so 1.4 MB each. */
export const KYC_FILE_BYTES = Math.floor(1.4 * 1024 * 1024);
export const kycUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: KYC_FILE_BYTES, files: 4 },
  fileFilter: (_req, file, cb) => cb(null, /^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.mimetype)),
}).fields([{ name: 'pan', maxCount: 1 }, { name: 'aadhaar', maxCount: 1 }, { name: 'gst', maxCount: 1 }, { name: 'msme', maxCount: 1 }, { name: 'other', maxCount: 1 }]);

export interface KycInput {
  type: 'individual' | 'entity';
  legalName: string; pan: string; aadhaarLast4: string; entityType: string; gstin: string; udyam: string; cin: string;
  signatory: string; designation: string; authority: string; address: string; state: string; pincode: string;
}

/** Cleans and checks the KYC fields. Returns the cleaned values or the first problem. */
export function readKyc(b: Record<string, unknown>, files: Record<string, unknown>): { ok: true; v: KycInput } | { ok: false; error: string } {
  const t = (k: string) => String(b[k] ?? '').trim();
  const type = t('type');
  if (type !== 'individual' && type !== 'entity') return { ok: false, error: 'Choose whether you work as an individual or as an entity' };
  const v: KycInput = {
    type, legalName: t('legalName'), pan: t('pan').toUpperCase(), aadhaarLast4: '', entityType: t('entityType'), gstin: t('gstin').toUpperCase(),
    udyam: t('udyam').toUpperCase(), cin: t('cin').toUpperCase(), signatory: t('signatory'), designation: t('designation'), authority: t('authority'),
    address: t('address'), state: t('state'), pincode: t('pincode'),
  };
  if (!v.legalName) return { ok: false, error: type === 'individual' ? 'Enter your name as it appears on your PAN' : 'Enter the registered name of the entity' };
  if (!PAN_RE.test(v.pan)) return { ok: false, error: type === 'individual' ? 'Enter a valid PAN, like ABCDE1234F' : "Enter the entity's PAN, like ABCDE1234F" };
  if (!v.address || v.address.length < 8) return { ok: false, error: 'Enter your full address' };
  if (!INDIAN_STATES.includes(v.state)) return { ok: false, error: 'Choose your state' };
  if (!PINCODE_RE.test(v.pincode)) return { ok: false, error: 'Enter a valid 6-digit PIN code' };
  const has = (k: string) => Array.isArray(files[k]) && (files[k] as unknown[]).length > 0;
  if (type === 'individual') {
    const aadhaar = t('aadhaar').replace(/\s/g, '');
    if (!aadhaarValid(aadhaar)) return { ok: false, error: 'Enter your 12-digit Aadhaar number correctly' };
    v.aadhaarLast4 = aadhaar.slice(-4); // the full number is never stored
    if (!has('pan')) return { ok: false, error: 'Upload a copy of your PAN card' };
    if (!has('aadhaar')) return { ok: false, error: 'Upload your Aadhaar card (masked Aadhaar is fine)' };
    Object.assign(v, { entityType: '', gstin: '', udyam: '', cin: '', signatory: '', designation: '', authority: '' });
    return { ok: true, v };
  }
  if (!ENTITY_TYPES.includes(v.entityType)) return { ok: false, error: 'Choose the type of entity' };
  if (!v.gstin && !v.udyam) return { ok: false, error: 'Enter a GST number or an MSME (Udyam) number' };
  if (v.gstin && !gstinValid(v.gstin)) return { ok: false, error: 'This GST number is not valid. Check it on your GST certificate.' };
  if (v.gstin && v.gstin.slice(2, 12) !== v.pan) return { ok: false, error: "The GST number doesn't belong to this PAN. Check both." };
  if (v.udyam && !UDYAM_RE.test(v.udyam)) return { ok: false, error: 'Enter the Udyam number like UDYAM-GJ-24-0012345' };
  if (v.gstin && !has('gst')) return { ok: false, error: 'Upload the GST registration certificate' };
  if (v.udyam && !has('msme')) return { ok: false, error: 'Upload the Udyam (MSME) certificate' };
  if (!v.signatory) return { ok: false, error: 'Enter the name of the authorised signatory' };
  if (v.cin && !/^([LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}|[A-Z]{3}-\d{4})$/.test(v.cin)) return { ok: false, error: 'Enter a valid CIN (21 characters) or LLPIN (like AAB-1234)' };
  return { ok: true, v };
}

export const maskPan = (p: string) => (p ? `${p.slice(0, 3)}•••${p.slice(-2)}` : '');
