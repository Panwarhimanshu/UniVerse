import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { DESTINATIONS } from '../data/services';
import { useToast } from '../lib/toast';
import { errMsg, Hero, Modal } from './modals';

type Row = { name: string; phone: string; email: string; country: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLUMNS: [keyof Row, string[]][] = [
  ['name', ['name', 'student name', 'student', 'full name']],
  ['phone', ['phone', 'mobile', 'phone number', 'mobile number', 'contact', 'whatsapp']],
  ['email', ['email', 'e-mail', 'email id', 'mail']],
  ['country', ['country', 'destination', 'study destination', 'study country']],
];

/* ---------- reading the file ---------- */
function parseDelimited(text: string): string[][] {
  const delim = text.split('\n')[0].includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** Finds the columns by their headings (any order); without headings, assumes name, phone, email, destination. */
function toRows(grid: string[][]): Row[] {
  if (!grid.length) return [];
  const head = grid[0].map((h) => h.trim().toLowerCase());
  const idx = COLUMNS.map(([, names]) => head.findIndex((h) => names.includes(h)));
  const hasHeader = idx.filter((i) => i >= 0).length >= 2;
  const cols = hasHeader ? idx : [0, 1, 2, 3];
  return (hasHeader ? grid.slice(1) : grid).map((r) => ({
    name: String(r[cols[0]] ?? '').trim(),
    phone: String(r[cols[1]] ?? '').trim(),
    email: String(r[cols[2]] ?? '').trim(),
    country: String(r[cols[3]] ?? '').trim(),
  })).filter((r) => r.name || r.phone || r.email);
}

const problem = (r: Row) =>
  !r.name ? 'Name missing' : r.phone.replace(/\D/g, '').length < 7 ? 'Phone missing' : !EMAIL_RE.test(r.email) ? 'Email not valid' : !r.country ? 'Destination missing' : '';

const TEMPLATE = 'Name,Phone,Email,Destination\nRiya Shah,+91 98250 11111,riya@example.com,Canada\nAarav Patel,+91 98250 22222,aarav@example.com,United Kingdom\n';

/* ---------- import modal ---------- */
export function ImportStudentsModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ added: number; skipped: { row: number; name: string; reason: string }[] } | null>(null);
  useEffect(() => { if (open) { setRows(null); setFileName(''); setPaste(''); setError(''); setResult(null); } }, [open]);

  const checked = useMemo(() => rows?.map((r) => ({ ...r, issue: problem(r) })) ?? [], [rows]);
  const good = checked.filter((r) => !r.issue);

  const readFile = async (file: File) => {
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        const data = await readSheet(file);
        setRows(toRows(data.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c))))));
      } else if (/\.(csv|txt|tsv)$/i.test(file.name)) {
        setRows(toRows(parseDelimited(await file.text())));
      } else {
        setError('Upload an Excel (.xlsx) or CSV file. Older .xls files: open in Excel and save as .xlsx.');
      }
    } catch (e) {
      setError(`Couldn't read that file: ${errMsg(e)}`);
    }
  };
  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    a.download = 'universe-students-template.csv';
    a.click();
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!good.length) return setError('There are no complete rows to import');
    setBusy(true);
    setError('');
    try {
      const r = await api.importStudents(good.map(({ issue: _issue, ...row }) => row)); // eslint-disable-line @typescript-eslint/no-unused-vars
      setResult(r);
      if (r.added) { toast(`${r.added} student${r.added === 1 ? '' : 's'} added.`); onDone(); }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Import students" sub="Add many students at once from Excel or a CSV file. Services can be requested for them later." onClose={onClose} />
      <div className="modal-body">
        {result ? (
          <div className="imp-result">
            <div className="imp-big"><b>{result.added}</b><span>student{result.added === 1 ? '' : 's'} added</span></div>
            {result.skipped.length ? (
              <>
                <p className="adm-meta" style={{ marginTop: '1rem' }}>{result.skipped.length} row{result.skipped.length === 1 ? ' was' : 's were'} skipped:</p>
                <ul className="imp-skip">{result.skipped.map((s) => <li key={s.row}><b>Row {s.row} · {s.name}</b><span>{s.reason}</span></li>)}</ul>
              </>
            ) : null}
            <div className="m-cta" style={{ marginTop: '1.2rem' }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
              <button className="btn btn-ghost" onClick={() => { setRows(null); setResult(null); setFileName(''); setPaste(''); }}>Import more</button>
            </div>
          </div>
        ) : rows ? (
          <form onSubmit={submit}>
            <div className="imp-summary">
              <span><b>{checked.length}</b> rows in {fileName || 'pasted data'}</span>
              <span className="ok"><b>{good.length}</b> ready</span>
              {checked.length - good.length ? <span className="bad"><b>{checked.length - good.length}</b> need fixing (skipped)</span> : null}
              <button type="button" className="link-btn" onClick={() => { setRows(null); setFileName(''); }}>Choose another file</button>
            </div>
            <div className="imp-table">
              <table className="tbl">
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Destination</th><th></th></tr></thead>
                <tbody>
                  {checked.slice(0, 200).map((r, i) => (
                    <tr key={i} className={r.issue ? 'imp-bad' : ''}>
                      <td>{i + 1}</td><td className="t-name">{r.name || '—'}</td><td>{r.phone || '—'}</td><td>{r.email || '—'}</td><td>{r.country || '—'}</td>
                      <td>{r.issue ? <span className="status hold">{r.issue}</span> : <span className="status done">Ready</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {checked.length > 200 ? <p className="adm-meta">Showing the first 200 rows.</p> : null}
            {error ? <p className="form-error">{error}</p> : null}
            <div className="m-cta" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !good.length}>{busy ? 'Importing…' : `Import ${good.length} student${good.length === 1 ? '' : 's'}`}</button>
              <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
            </div>
            <p className="adm-meta" style={{ marginTop: '.6rem' }}>Students already in your list (same email or phone) are skipped automatically.</p>
          </form>
        ) : (
          <>
            <div
              className="imp-drop"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('over')}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
              role="button" tabIndex={0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M12 18v-6" /><path d="m9 15 3-3 3 3" /></svg>
              <b>Drop your Excel or CSV file here</b>
              <span>or click to choose · .xlsx or .csv · up to 500 students</span>
              <input ref={fileRef} type="file" hidden accept=".xlsx,.csv,.txt,.tsv" onChange={async (e) => { const input = e.currentTarget; const f = input.files?.[0]; if (f) await readFile(f); input.value = ''; }} />
            </div>
            <div className="imp-or"><span>or paste rows copied from Excel</span></div>
            <textarea className="imp-paste" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Name\tPhone\tEmail\tDestination\nRiya Shah\t+91 98250 11111\triya@example.com\tCanada'} />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="m-cta" style={{ marginTop: '.8rem' }}>
              <button className="btn btn-primary" disabled={!paste.trim()} onClick={() => { setFileName(''); setRows(toRows(parseDelimited(paste))); }}>Check pasted rows</button>
              <button className="btn btn-ghost" onClick={downloadTemplate}>Download template</button>
            </div>
            <p className="adm-meta" style={{ marginTop: '.8rem' }}>
              Columns: <b>Name, Phone, Email, Destination</b> (any order, with these headings). Destinations: {DESTINATIONS.slice(0, 6).join(', ')} and any other country; UK, USA and UAE work too.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ---------- add one student (record only, no service request) ---------- */
export function AddStudentModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', phone: '', email: '', country: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    setF({ name: '', phone: '', email: '', country: '' });
    setError('');
    api.meta().then((m) => setCountries([...m.destinations, ...(m.countries ?? []).filter((c) => !m.destinations.includes(c))])).catch(() => {});
  }, [open]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.name.trim() || !f.phone.trim() || !f.country) return setError('Fill in all the fields');
    if (!EMAIL_RE.test(f.email.trim())) return setError('Enter a valid email');
    setBusy(true);
    try {
      await api.addStudent({ ...f, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() });
      toast(`${f.name.trim()} added to your students.`);
      onDone();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Hero title="Add a student" sub="Save the student now and request services for them whenever you're ready." onClose={onClose} />
      <div className="modal-body">
        <form className="form-grid" onSubmit={submit} noValidate>
          <div className="field full"><label htmlFor="asName">Student name *</label><input id="asName" placeholder="e.g. Riya Shah" value={f.name} onChange={set('name')} autoFocus /></div>
          <div className="field"><label htmlFor="asPhone">Phone *</label><input id="asPhone" type="tel" placeholder="+91 98XXX XXXXX" value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label htmlFor="asEmail">Email *</label><input id="asEmail" type="email" placeholder="student@gmail.com" value={f.email} onChange={set('email')} /></div>
          <div className="field full">
            <label htmlFor="asCountry">Destination *</label>
            <select id="asCountry" value={f.country} onChange={set('country')}>
              <option value="">Select destination</option>
              {(countries.length ? countries : DESTINATIONS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error ? <p className="form-error full">{error}</p> : null}
          <div className="full m-cta">
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Saving…' : 'Add student'}</button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
