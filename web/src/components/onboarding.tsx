import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { SignInput } from '../lib/api';

/* Pieces shared by the sign-up application, the portal's KYC & agreement page, and the GST invoice signature. */

/* ---------- signature pad: strokes recorded as an SVG path in a 600×200 box (what the server draws on PDFs) ---------- */
export function SignaturePad({ onChange }: { onChange: (path: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const path = useRef('');
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current!;
    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * devicePixelRatio;
      c.height = r.height * devicePixelRatio;
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toBox = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 600), Math.round(((e.clientY - r.top) / r.height) * 200)];
  };
  const redraw = () => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!path.current) return;
    ctx.save();
    ctx.scale(c.width / 600, c.height / 200);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#16347B';
    ctx.stroke(new Path2D(path.current));
    ctx.restore();
  };
  const down = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const [x, y] = toBox(e);
    path.current += `${path.current ? ' ' : ''}M${x} ${y}`;
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const [x, y] = toBox(e);
    path.current += ` L${x} ${y}`;
    redraw();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const ok = /L/.test(path.current);
    setEmpty(!ok);
    onChange(ok ? path.current : '');
  };
  const clear = () => {
    path.current = '';
    setEmpty(true);
    onChange('');
    redraw();
  };
  return (
    <div className="sig-pad">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Draw your signature" />
      {empty ? <span className="sig-hint">Sign here with your mouse or finger</span> : null}
      <button type="button" className="sig-clear" onClick={clear}>Clear</button>
    </div>
  );
}

/* ---------- images are shrunk before upload: three certificates must fit one 4.5 MB request ---------- */
export const KYC_MAX = 1.4 * 1024 * 1024;
export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= 700 * 1024) return file;
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file;
}

/* ---------- KYC fields: individual (PAN) or entity (GSTIN / Udyam + certificates) ---------- */
export interface KycValues {
  type: 'individual' | 'entity' | '';
  legalName: string; pan: string; entityType: string; gstin: string; udyam: string; cin: string;
  signatory: string; designation: string; authority: string; address: string; state: string; pincode: string;
}
export const emptyKyc: KycValues = {
  type: '', legalName: '', pan: '', entityType: '', gstin: '', udyam: '', cin: '', signatory: '', designation: '', authority: '', address: '', state: '', pincode: '',
};
export type KycFiles = Partial<Record<'pan' | 'gst' | 'msme', File>>;

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const UDYAM_RE = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

/** The first problem with the KYC form, or '' when it's ready. `onFile` kinds already uploaded count as present. */
export function kycProblem(v: KycValues, files: KycFiles, onFile: string[] = []) {
  const has = (k: 'pan' | 'gst' | 'msme') => !!files[k] || onFile.includes(k);
  if (!v.type) return 'Choose whether you work as an individual or as an entity';
  if (!v.legalName.trim()) return v.type === 'individual' ? 'Enter your name as it appears on your PAN' : 'Enter the registered name of the entity';
  if (!PAN_RE.test(v.pan)) return 'Enter a valid PAN, like ABCDE1234F';
  if (v.type === 'individual' && !has('pan')) return 'Upload a copy of your PAN card';
  if (v.type === 'entity') {
    if (!v.entityType) return 'Choose the type of entity';
    if (!v.gstin && !v.udyam) return 'Enter a GST number or an MSME (Udyam) number';
    if (v.gstin && !GSTIN_RE.test(v.gstin)) return 'Enter a valid 15-character GST number';
    if (v.gstin && v.gstin.slice(2, 12) !== v.pan) return "The GST number doesn't belong to this PAN";
    if (v.udyam && !UDYAM_RE.test(v.udyam)) return 'Enter the Udyam number like UDYAM-GJ-24-0012345';
    if (v.gstin && !has('gst')) return 'Upload the GST registration certificate';
    if (v.udyam && !has('msme')) return 'Upload the Udyam (MSME) certificate';
    if (!v.signatory.trim()) return 'Enter the name of the authorised signatory';
  }
  if (v.address.trim().length < 8) return 'Enter your full address';
  if (!v.state) return 'Choose your state';
  if (!/^[1-9]\d{5}$/.test(v.pincode)) return 'Enter a valid 6-digit PIN code';
  return '';
}

export function kycForm(v: KycValues, files: KycFiles, form = new FormData()) {
  for (const [k, val] of Object.entries(v)) form.append(k, val);
  for (const [k, f] of Object.entries(files)) if (f) form.append(k, f);
  return form;
}

function FileField({ id, label, file, onFile, uploaded, hint }: { id: string; label: string; file?: File; onFile: (f: File | undefined) => void; uploaded?: string; hint?: string }) {
  const [err, setErr] = useState('');
  return (
    <div className="field kyc-file">
      <label htmlFor={id}>{label}</label>
      <label className={`kyc-drop${file || uploaded ? ' has' : ''}`} htmlFor={id}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
        <span>{file ? file.name : uploaded ? `${uploaded} (uploaded, choose to replace)` : 'Choose PDF or photo'}</span>
      </label>
      <input id={id} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        setErr('');
        if (!f) return;
        if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type)) return setErr('Use a PDF, JPG, PNG or WebP file');
        const small = await shrinkImage(f);
        if (small.size > KYC_MAX) return setErr('Keep the file under 1.4 MB. Scan at a lower resolution or upload a photo instead.');
        onFile(small);
      }} />
      {err ? <span className="field-err">{err}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function KycFields({ v, set, files, setFiles, states, entityTypes, uploaded = {} }: {
  v: KycValues; set: (v: KycValues) => void; files: KycFiles; setFiles: (f: KycFiles) => void; states: string[]; entityTypes: string[];
  uploaded?: Partial<Record<'pan' | 'gst' | 'msme', string>>;
}) {
  const f = (k: keyof KycValues, upper = false) => ({
    value: v[k], onChange: (e: { target: { value: string } }) => set({ ...v, [k]: upper ? e.target.value.toUpperCase().replace(/\s/g, '') : e.target.value }),
  });
  return (
    <div className="kyc">
      <div className="kyc-type" role="radiogroup" aria-label="How do you work with UniVerse?">
        {([['individual', 'Individual', 'I work on my own. PAN card needed.'], ['entity', 'Entity', 'Company, LLP, firm or proprietorship. GST or MSME certificate needed.']] as const).map(([k, t, d]) => (
          <button key={k} type="button" role="radio" aria-checked={v.type === k} className={v.type === k ? 'on' : ''} onClick={() => set({ ...v, type: k })}>
            <b>{t}</b><span>{d}</span>
          </button>
        ))}
      </div>
      {v.type === 'individual' ? (
        <div className="field-grid">
          <div className="field"><label htmlFor="kLegal">Name as on PAN *</label><input id="kLegal" {...f('legalName')} /></div>
          <div className="field"><label htmlFor="kPan">PAN *</label><input id="kPan" maxLength={10} placeholder="ABCDE1234F" {...f('pan', true)} /></div>
          <div className="full"><FileField id="kPanFile" label="PAN card *" file={files.pan} uploaded={uploaded.pan} onFile={(x) => setFiles({ ...files, pan: x })} /></div>
        </div>
      ) : null}
      {v.type === 'entity' ? (
        <div className="field-grid">
          <div className="field"><label htmlFor="kLegal">Registered name *</label><input id="kLegal" placeholder="As on the GST / MSME certificate" {...f('legalName')} /></div>
          <div className="field">
            <label htmlFor="kEt">Type of entity *</label>
            <select id="kEt" {...f('entityType')}><option value="">Select</option>{entityTypes.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="kPan">PAN of the entity *</label><input id="kPan" maxLength={10} placeholder="ABCDE1234F" {...f('pan', true)} /></div>
          <div className="field"><label htmlFor="kCin">CIN / LLPIN</label><input id="kCin" placeholder="If registered with MCA" {...f('cin', true)} /></div>
          <div className="field"><label htmlFor="kGst">GST number</label><input id="kGst" maxLength={15} placeholder="24ABCDE1234F1Z5" {...f('gstin', true)} /></div>
          <div className="field"><label htmlFor="kUdyam">MSME (Udyam) number</label><input id="kUdyam" placeholder="UDYAM-GJ-24-0012345" {...f('udyam', true)} /></div>
          <p className="full field-hint" style={{ marginTop: '-.4rem' }}>Enter at least one: GST number or MSME (Udyam) number, and upload its certificate.</p>
          <FileField id="kGstFile" label={`GST certificate${v.gstin ? ' *' : ''}`} file={files.gst} uploaded={uploaded.gst} onFile={(x) => setFiles({ ...files, gst: x })} />
          <FileField id="kMsmeFile" label={`MSME (Udyam) certificate${v.udyam ? ' *' : ''}`} file={files.msme} uploaded={uploaded.msme} onFile={(x) => setFiles({ ...files, msme: x })} />
          <div className="field"><label htmlFor="kSig">Authorised signatory *</label><input id="kSig" placeholder="Who will sign the agreement" {...f('signatory')} /></div>
          <div className="field"><label htmlFor="kDes">Designation</label><input id="kDes" placeholder="Director, Partner, Proprietor…" {...f('designation')} /></div>
          <div className="field full"><label htmlFor="kAuth">Authority to sign</label><input id="kAuth" placeholder="e.g. board resolution dated 10 October 2026 (optional)" {...f('authority')} /></div>
        </div>
      ) : null}
      {v.type ? (
        <div className="field-grid">
          <div className="field full"><label htmlFor="kAddr">{v.type === 'entity' ? 'Registered address' : 'Address'} *</label><input id="kAddr" placeholder="Building, street, area, city" {...f('address')} /></div>
          <div className="field">
            <label htmlFor="kState">State *</label>
            <select id="kState" {...f('state')}><option value="">Select state</option>{states.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="kPin">PIN code *</label><input id="kPin" inputMode="numeric" maxLength={6} {...f('pincode')} /></div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- read and sign an agreement ---------- */
export function AgreementSigner({ pdfUrl, defaultName, onSign, children }: {
  pdfUrl: string | null; defaultName: string; onSign: (b: SignInput) => Promise<void>; children?: ReactNode;
}) {
  const [name, setName] = useState(defaultName);
  const [sig, setSig] = useState('');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (!accept) return setError('Tick the box to confirm you have read and accept the agreement');
    if (name.trim().length < 3) return setError('Type your full name');
    if (!sig) return setError('Draw your signature in the box');
    setBusy(true);
    try {
      await onSign({ name: name.trim(), signature: sig, accept: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign');
      setBusy(false);
    }
  };
  return (
    <div className="agr-sign">
      <div className="agr-pdf">
        {pdfUrl ? <iframe src={`${pdfUrl}#view=FitH`} title="Partner agreement" /> : <div className="empty-state">Loading the agreement…</div>}
        {pdfUrl ? <a className="btn btn-ghost btn-sm" href={pdfUrl} download="UniVerse agreement.pdf">Download PDF</a> : null}
      </div>
      {children}
      <div className="field"><label htmlFor="sgName">Full name (as signatory)</label><input id="sgName" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <label className="pp-label">Signature</label>
      <SignaturePad onChange={setSig} />
      <label className="agr-accept"><input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} /> I have read the Channel Partner Agreement, including Schedules A and B, and I agree to be bound by it.</label>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="button" className="btn btn-primary btn-block btn-lg" disabled={busy} onClick={submit}>{busy ? 'Signing…' : 'Sign the agreement'}</button>
      <p className="field-hint" style={{ marginTop: '.5rem' }}>Your name, the time, your IP address and a fingerprint of the document are recorded with your signature.</p>
    </div>
  );
}

/** Meta lists (states, entity types) for the KYC form */
export function useOnboardingMeta() {
  const [meta, setMeta] = useState<{ states: string[]; entityTypes: string[]; sla: string }>({ states: [], entityTypes: [], sla: '48 hours' });
  useEffect(() => { api.onboardingMeta().then(setMeta).catch(() => {}); }, []);
  return meta;
}
