import { useEffect, useRef, useState } from 'react';
import { Alert, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { Feather, Field, PickerField } from './ui';
import { api } from '../lib/api';
import type { UploadFile } from '../lib/api';
import { notify } from '../lib/dialog';
import { colors, radius, space, type } from '../theme';

/* Shared by the sign-up application, the KYC & agreement screen and the GST invoice signature. */

/* ---------- signature pad: strokes in a 600×200 box, sent as an SVG path (the server draws it on the PDF) ---------- */
export function SignaturePad({ onChange, onActive }: { onChange: (path: string) => void; onActive?: (drawing: boolean) => void }) {
  const [path, setPath] = useState('');
  const [width, setWidth] = useState(0);
  const pathRef = useRef('');
  const widthRef = useRef(0);
  const height = width / 3;
  const toBox = (x: number, y: number) => {
    const w = widthRef.current || 1;
    return `${Math.round((x / w) * 600)} ${Math.round((y / (w / 3)) * 200)}`;
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      onActive?.(true);
      pathRef.current += `${pathRef.current ? ' ' : ''}M${toBox(e.nativeEvent.locationX, e.nativeEvent.locationY)}`;
      setPath(pathRef.current);
    },
    onPanResponderMove: (e) => {
      pathRef.current += ` L${toBox(e.nativeEvent.locationX, e.nativeEvent.locationY)}`;
      setPath(pathRef.current);
    },
    onPanResponderRelease: () => {
      onActive?.(false);
      onChange(/L/.test(pathRef.current) ? pathRef.current : '');
    },
    onPanResponderTerminate: () => onActive?.(false),
  })).current;
  const clear = () => { pathRef.current = ''; setPath(''); onChange(''); };
  return (
    <View style={styles.pad} onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; setWidth(e.nativeEvent.layout.width); }}>
      <View style={{ height: height || 110 }} {...pan.panHandlers}>
        {width ? (
          <Svg width={width} height={height} viewBox="0 0 600 200" pointerEvents="none">
            <Path d={path || 'M0 0'} stroke={colors.text} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        ) : null}
        {!path ? <Text style={styles.padHint} pointerEvents="none">Sign here with your finger</Text> : null}
      </View>
      {path ? <Pressable onPress={clear} style={styles.clear} hitSlop={8}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Clear</Text></Pressable> : null}
    </View>
  );
}

/* ---------- certificates: PDF or a photo (camera keeps them small enough for one upload) ---------- */
export const KYC_MAX = 1.4 * 1024 * 1024;
export async function pickCertificate(label: string): Promise<UploadFile | null> {
  const fromCamera = await new Promise<boolean | null>((resolve) => {
    if (Platform.OS === 'web') return resolve(false);
    Alert.alert(label, 'Add a PDF or take a photo of the certificate.', [
      { text: 'Take photo', onPress: () => resolve(true) },
      { text: 'Choose file', onPress: () => resolve(false) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
  if (fromCamera === null) return null;
  let f: UploadFile | null = null;
  if (fromCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { notify('Camera not allowed', 'Allow camera access in settings, or choose a file instead.'); return null; }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: true });
    if (shot.canceled || !shot.assets[0]) return null;
    const a = shot.assets[0];
    f = { uri: a.uri, name: `${label.replace(/[^\w ]+/g, '').trim() || 'certificate'}.jpg`, size: a.fileSize, mimeType: 'image/jpeg' };
  } else {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    f = { uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType, file: a.file };
  }
  if (f.size && f.size > KYC_MAX) {
    notify('File too large', 'Certificates can be up to 1.4 MB. Take a photo instead, or use a smaller scan.');
    return null;
  }
  return f;
}

/* ---------- KYC form ---------- */
export interface KycValues {
  type: 'individual' | 'entity' | '';
  legalName: string; pan: string; aadhaar: string; entityType: string; gstin: string; udyam: string; cin: string;
  signatory: string; designation: string; authority: string; address: string; state: string; pincode: string;
}
export const emptyKyc: KycValues = {
  type: '', legalName: '', pan: '', aadhaar: '', entityType: '', gstin: '', udyam: '', cin: '', signatory: '', designation: '', authority: '', address: '', state: '', pincode: '',
};
export type KycFiles = Partial<Record<'pan' | 'aadhaar' | 'gst' | 'msme', UploadFile>>;

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const UDYAM_RE = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;

export function kycProblem(v: KycValues, files: KycFiles, onFile: string[] = []) {
  const has = (k: 'pan' | 'aadhaar' | 'gst' | 'msme') => !!files[k] || onFile.includes(k);
  if (!v.type) return 'Choose whether you work as an individual or as an entity';
  if (!v.legalName.trim()) return v.type === 'individual' ? 'Enter your name as it appears on your PAN' : 'Enter the registered name of the entity';
  if (!PAN_RE.test(v.pan)) return 'Enter a valid PAN, like ABCDE1234F';
  if (v.type === 'individual') {
    if (!/^[2-9]\d{11}$/.test(v.aadhaar)) return 'Enter your 12-digit Aadhaar number';
    if (!has('pan')) return 'Add a copy of your PAN card';
    if (!has('aadhaar')) return 'Add your Aadhaar card (a masked Aadhaar is fine)';
  }
  if (v.type === 'entity') {
    if (!v.entityType) return 'Choose the type of entity';
    if (!v.gstin && !v.udyam) return 'Enter a GST number or an MSME (Udyam) number';
    if (v.gstin && !GSTIN_RE.test(v.gstin)) return 'Enter a valid 15-character GST number';
    if (v.gstin && v.gstin.slice(2, 12) !== v.pan) return "The GST number doesn't belong to this PAN";
    if (v.udyam && !UDYAM_RE.test(v.udyam)) return 'Enter the Udyam number like UDYAM-GJ-24-0012345';
    if (v.gstin && !has('gst')) return 'Add the GST registration certificate';
    if (v.udyam && !has('msme')) return 'Add the Udyam (MSME) certificate';
    if (!v.signatory.trim()) return 'Enter the name of the authorised signatory';
  }
  if (v.address.trim().length < 8) return 'Enter your full address';
  if (!v.state) return 'Choose your state';
  if (!/^[1-9]\d{5}$/.test(v.pincode)) return 'Enter a valid 6-digit PIN code';
  return '';
}

export function kycForm(v: KycValues, files: KycFiles, form = new FormData()) {
  for (const [k, val] of Object.entries(v)) form.append(k, val);
  for (const [k, f] of Object.entries(files)) if (f) appendUpload(form, k, f);
  return form;
}
const appendUpload = (form: FormData, field: string, f: UploadFile) => {
  if (f.file) form.append(field, f.file);
  else form.append(field, { uri: f.uri, name: f.name, type: f.mimeType ?? 'application/octet-stream' } as unknown as Blob);
};

export function useOnboardingMeta() {
  const [meta, setMeta] = useState<{ states: string[]; entityTypes: string[]; sla: string }>({ states: [], entityTypes: [], sla: '48 hours' });
  useEffect(() => { api.onboardingMeta().then(setMeta).catch(() => {}); }, []);
  return meta;
}

function FileRow({ label, file, uploaded, onPick }: { label: string; file?: UploadFile; uploaded?: string; onPick: (f: UploadFile) => void }) {
  return (
    <Pressable onPress={async () => { const f = await pickCertificate(label); if (f) onPick(f); }} style={[styles.file, (file || uploaded) && styles.fileOn]}>
      <Feather name={file || uploaded ? 'check-circle' : 'upload'} size={18} color={file || uploaded ? colors.positive : colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[type.body, { fontWeight: '600' }]}>{label}</Text>
        <Text style={type.small} numberOfLines={1}>{file ? file.name : uploaded ? `${uploaded} · tap to replace` : 'PDF or photo, up to 1.4 MB'}</Text>
      </View>
    </Pressable>
  );
}

export function KycForm({ v, set, files, setFiles, uploaded = {} }: {
  v: KycValues; set: (v: KycValues) => void; files: KycFiles; setFiles: (f: KycFiles) => void; uploaded?: Partial<Record<'pan' | 'aadhaar' | 'gst' | 'msme', string>>;
}) {
  const meta = useOnboardingMeta();
  const field = (k: keyof KycValues, upper = false) => ({ value: v[k], onChangeText: (x: string) => set({ ...v, [k]: upper ? x.toUpperCase().replace(/\s/g, '') : x }) });
  return (
    <View>
      <Text style={[type.small, { marginBottom: 6, color: colors.text, fontWeight: '500' }]}>How do you work with UniVerse?</Text>
      <View style={styles.types}>
        {([['individual', 'Individual', 'On my own. PAN and Aadhaar needed.', 'user'], ['entity', 'Entity', 'Company, LLP, firm or proprietorship. GST or MSME certificate.', 'briefcase']] as const).map(([k, t, d, icon]) => {
          const on = v.type === k;
          return (
            <Pressable key={k} onPress={() => set({ ...v, type: k })} style={[styles.type, on && styles.typeOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
              <Feather name={icon} size={18} color={on ? colors.primary : colors.muted} />
              <Text style={[type.body, { fontWeight: '700' }]}>{t}</Text>
              <Text style={type.small}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
      {v.type === 'individual' ? (
        <>
          <Field label="Name as on PAN" {...field('legalName')} />
          <Field label="PAN" placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} {...field('pan', true)} />
          <Field label="Aadhaar number" placeholder="12-digit Aadhaar" keyboardType="number-pad" maxLength={12} value={v.aadhaar} onChangeText={(x: string) => set({ ...v, aadhaar: x.replace(/\D/g, '') })} />
          <Text style={[type.small, { marginTop: -10, marginBottom: space.md }]}>Only the last 4 digits are stored, as the Aadhaar Act requires.</Text>
          <FileRow label="PAN card" file={files.pan} uploaded={uploaded.pan} onPick={(f) => setFiles({ ...files, pan: f })} />
          <FileRow label="Aadhaar card (masked is fine)" file={files.aadhaar} uploaded={uploaded.aadhaar} onPick={(f) => setFiles({ ...files, aadhaar: f })} />
        </>
      ) : null}
      {v.type === 'entity' ? (
        <>
          <Field label="Registered name" placeholder="As on the GST / MSME certificate" {...field('legalName')} />
          <PickerField label="Type of entity" value={v.entityType} placeholder="Choose" title="Type of entity"
            items={meta.entityTypes.map((x) => ({ key: x, label: x }))} onPick={(x) => set({ ...v, entityType: x })} />
          <Field label="PAN of the entity" placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} {...field('pan', true)} />
          <Field label="GST number" placeholder="24ABCDE1234F1Z5" autoCapitalize="characters" maxLength={15} {...field('gstin', true)} />
          <Field label="MSME (Udyam) number" placeholder="UDYAM-GJ-24-0012345" autoCapitalize="characters" {...field('udyam', true)} />
          <Text style={[type.small, { marginTop: -8, marginBottom: space.md }]}>Enter at least one of GST or Udyam, and add its certificate.</Text>
          <FileRow label={`GST certificate${v.gstin ? '' : ' (if you have GST)'}`} file={files.gst} uploaded={uploaded.gst} onPick={(f) => setFiles({ ...files, gst: f })} />
          <FileRow label={`Udyam certificate${v.udyam ? '' : ' (if you have Udyam)'}`} file={files.msme} uploaded={uploaded.msme} onPick={(f) => setFiles({ ...files, msme: f })} />
          <Field label="CIN / LLPIN (optional)" autoCapitalize="characters" {...field('cin', true)} />
          <Field label="Authorised signatory" placeholder="Who signs the agreement" {...field('signatory')} />
          <Field label="Designation" placeholder="Director, Partner, Proprietor…" {...field('designation')} />
          <Field label="Authority to sign (optional)" placeholder="e.g. board resolution dated 10 Oct 2026" {...field('authority')} />
        </>
      ) : null}
      {v.type ? (
        <>
          <Field label={v.type === 'entity' ? 'Registered address' : 'Address'} placeholder="Building, street, area, city" multiline {...field('address')} />
          <PickerField label="State" value={v.state} placeholder="Choose your state" title="State"
            items={meta.states.map((x) => ({ key: x, label: x }))} onPick={(x) => set({ ...v, state: x })} />
          <Field label="PIN code" keyboardType="number-pad" maxLength={6} {...field('pincode')} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.lg, backgroundColor: '#fff', marginBottom: space.md, overflow: 'hidden' },
  padHint: { position: 'absolute', alignSelf: 'center', top: '42%', color: colors.faint, fontSize: 13 },
  clear: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  types: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  type: { flex: 1, gap: 4, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line },
  typeOn: { borderColor: colors.primary, backgroundColor: colors.accentTint },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line, marginBottom: space.lg },
  fileOn: { borderStyle: 'solid', borderColor: colors.positive, backgroundColor: colors.positiveTint },
});
