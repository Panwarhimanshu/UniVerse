/* Service catalogue shown on the site and in the dashboard */

export const ICONS = {
  loan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  gic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  blocked: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  remit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  forex: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  insurance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  oshc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  housing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  sim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" stroke-width="3"/></svg>',
};

export interface Service {
  key: string;
  icon: string;
  sub: string;
  name: string;
  img: string;
  green: boolean; // alternate card tint
  flags: string[];
  flagLabel?: string;
  globe?: boolean;
  short: string;
  cardText: string;
  tat: string;
  countries: string;
  kpis: [string, string][];
  about: string;
  feats: string[];
  partners: string[];
  partnerTypes: string[]; // label under each partner card on the service page
  steps: string[];
  related: string[];
  hidden?: boolean; // turned off by the master admin
}

export const SERVICES: Service[] = [
  {
    key: 'education-loans', icon: ICONS.loan, sub: 'Funding & Forex', name: 'Education Loans', img: 'svc-loans.jpg', green: false, flags: [], globe: true,
    short: 'Secured & unsecured study loans from ₹5 lakh to ₹1.5 crore.',
    cardText: 'Secured & unsecured study loans from ₹5 lakh to ₹1.5 crore across 14+ lenders.',
    tat: '7–14 days', countries: 'All destinations',
    kpis: [['₹1.5 Cr', 'Max sanction'], ['14+', 'Lending partners'], ['7–14d', 'Sanction time']],
    about: 'Collateral and non-collateral education loans covering tuition, living costs, travel and forex, matched to the right lender so every student file reaches sanction before the visa deadline.',
    feats: ['Loan up to ₹1.5 Cr with collateral', 'Up to ₹75 lakh unsecured on profile', 'Interest concessions for meritorious students', 'Sanction letter accepted for visa filing', 'Moratorium & flexible repayment', 'Doorstep documentation support'],
    partners: ['SBI', 'Bank of Baroda', 'PNB', 'Union Bank', 'Axis Bank', 'ICICI Bank', 'YES Bank', 'IDFC First', 'HDFC Credila', 'Avanse', 'Auxilo', 'Tata Capital', 'Poonawalla Fincorp', 'Prodigy Finance'],
    partnerTypes: ['Lending Partner', 'Lending Partner', 'Lending Partner', 'Lending Partner', 'Lending Partner', 'Lending Partner', 'Lending Partner', 'Lending Partner', 'NBFC Lender', 'NBFC Lender', 'NBFC Lender', 'NBFC Lender', 'NBFC Lender', 'International Lender'],
    steps: ['Share the student profile and admit letter', 'We match 3–4 best-fit lenders the same day', 'Documentation, follow-ups and query handling', 'Sanction letter issued: commission credited on disbursal'],
    related: ['german-blocked-account', 'fee-payments', 'forex-card'],
  },
  {
    key: 'canada-gic', icon: ICONS.gic, sub: 'Banking', name: 'Canada GIC', img: 'svc-gic.jpg', green: true, flags: ['ca'], flagLabel: 'Canada',
    short: 'Guaranteed Investment Certificate for the Student Direct Stream.',
    cardText: 'Guaranteed Investment Certificate: CAD 23,448 proof of funds for the SDS stream.',
    tat: '5–7 days', countries: 'Canada',
    kpis: [['CAD 23,448', 'Min. deposit'], ['4', 'GIC banks'], ['5–7d', 'Certificate time']],
    about: 'Full GIC setup for SDS and non-SDS applicants: account opening, CAD 23,448 transfer guidance and the Investment Declaration needed for the Canadian study permit.',
    feats: ['CIBC, BMO, ICICI Bank Canada & Beacon Money', 'SDS-compliant investment declaration', 'Wire transfer & FX guidance for the deposit', 'Refund-friendly process if the visa is refused', 'Activation support after landing in Canada'],
    partners: ['CIBC', 'BMO', 'ICICI Bank Canada', 'Beacon Money'],
    partnerTypes: ['GIC Bank · Canada', 'GIC Bank · Canada', 'GIC Bank · Canada', 'GIC Alternative · Canada'],
    steps: ['Choose the GIC bank with the student', 'Account opened & wiring details shared in 48h', 'Student remits CAD 23,448 + fees', 'GIC certificate issued in 5–7 days: payout credited on funding'],
    related: ['fee-payments', 'forex-card', 'insurance'],
  },
  {
    key: 'german-blocked-account', icon: ICONS.blocked, sub: 'Banking', name: 'German Blocked Account', img: 'svc-blocked.jpg', green: false, flags: ['de'], flagLabel: 'Germany',
    short: 'Expatrio-powered Sperrkonto for the German student visa.',
    cardText: 'Expatrio-powered Sperrkonto with €11,904 deposit and instant visa letter.',
    tat: '3–5 days', countries: 'Germany',
    kpis: [['€11,904', 'Annual amount'], ['€992/mo', 'Payout schedule'], ['3–5d', 'Confirmation']],
    about: 'Blocked account, health insurance and free current account bundled through Expatrio, with the instant confirmation letter German consulates require.',
    feats: ['0€ account-opening fee options', 'Instant 06-confirmation letter for visa', 'Bundled incoming + statutory health insurance', 'Payouts of €992 per month, visa-compliant', 'Extension letters for later semesters'],
    partners: ['Expatrio'],
    partnerTypes: ['Blocked Account Provider'],
    steps: ['Student registers with passport & admit letter', 'Transfers €11,904 to the assigned IBAN', 'Confirmation letter generated within 3–5 days', 'Activation & payout setup on arrival: payout credited on funding'],
    related: ['forex-card', 'insurance', 'oshc-ovhc'],
  },
  {
    key: 'fee-payments', icon: ICONS.remit, sub: 'Funding & Forex', name: 'Fee Payment & Remittance', img: 'svc-fee.jpg', green: true, flags: [], globe: true,
    short: 'Tuition & living-cost transfers at competitive FX rates.',
    cardText: 'Tuition and living-cost transfers with live FX rates and university receipts.',
    tat: '2–3 days', countries: 'All destinations',
    kpis: [['2–3d', 'Credit time'], ['4', 'Payment rails'], ['0', 'Hidden charges']],
    about: 'RBI-compliant outward remittance under LRS for tuition, deposits and student living costs, with university receipt tracking and better rates than bank counters.',
    feats: ['Flywire, Convera, PayMyTuition & TransferMate rails', 'Live interbank-linked FX rates', 'TCS & LRS documentation handled', 'University confirmation shared with agent', 'Same-rail transfers for hostel & GIC deposits'],
    partners: ['Flywire', 'Convera', 'PayMyTuition', 'TransferMate'],
    partnerTypes: ['Payment Rails', 'Payment Rails', 'Payment Rails', 'Payment Rails'],
    steps: ['Upload the university fee invoice', 'Student transfers INR: rate locked live', 'University credited in 2–3 working days', 'Receipt shared: commission credited on completion'],
    related: ['insurance', 'oshc-ovhc', 'accommodation'],
  },
  {
    key: 'forex-card', icon: ICONS.forex, sub: 'Funding & Forex', name: 'Multi-Currency Forex Card', img: 'svc-forex.jpg', green: false, flags: [], globe: true,
    short: 'One prepaid card carrying 14+ currencies, loaded from India.',
    cardText: 'One prepaid card for 14+ currencies, loaded and delivered before departure.',
    tat: '24–48 hrs', countries: 'All destinations',
    kpis: [['14+', 'Currencies'], ['24–48h', 'Card delivery'], ['0%*', 'Markup plans']],
    about: 'A student-first prepaid forex card with interbank-linked loads, app control and instant reloads: safer and cheaper than carrying currency.',
    feats: ['14+ currencies on a single card', 'Card delivered before departure', 'Reload anytime from the app', 'ATM withdrawals & POS spending worldwide', 'Complimentary travel insurance on select plans'],
    partners: ['EbixCash', 'Thomas Cook'],
    partnerTypes: ['Forex Card Issuer', 'Forex Card Issuer'],
    steps: ['Submit KYC and travel details', 'Choose load currency & amount: CAD 300+ starter packs', 'Card delivered and loaded in 24–48 hours', 'Payout credited on first successful load'],
    related: ['oshc-ovhc', 'accommodation', 'sim-cards'],
  },
  {
    key: 'insurance', icon: ICONS.insurance, sub: 'Insurance', name: 'Travel & Student Insurance', img: 'svc-insurance.jpg', green: true, flags: [], globe: true,
    short: 'Visa-compliant medical and travel cover, worldwide.',
    cardText: 'Visa-compliant medical and travel cover issued the very same day.',
    tat: 'Same day', countries: 'All destinations',
    kpis: [['Same day', 'Policy issue'], ['3+', 'Insurers'], ['100%', 'Visa-compliant']],
    about: 'Comprehensive student medical and travel policies accepted by universities and consulates, issued the same day and emailed straight to the student.',
    feats: ['Allianz Care, ICICI Lombard & Tata AIG', 'University waiver-friendly plans', 'Covers hospitalisation, baggage & sponsors', 'Refund if visa is refused (T&C apply)', 'Instant policy certificate by email'],
    partners: ['Allianz Care', 'ICICI Lombard', 'Tata AIG'],
    partnerTypes: ['Insurer', 'Insurer', 'Insurer'],
    steps: ['Share destination, course start & duration', 'Pick the plan matched to visa rules', 'Pay online: policy issued same day', 'Payout credited on premium payment'],
    related: ['accommodation', 'sim-cards', 'education-loans'],
  },
  {
    key: 'oshc-ovhc', icon: ICONS.oshc, sub: 'Insurance', name: 'OSHC / OVHC', img: 'svc-oshc.jpg', green: false, flags: ['au'], flagLabel: 'Australia',
    short: 'Mandatory health cover for Australian student & visitor visas.',
    cardText: 'Mandatory health cover from approved funds, ready for ImmiAccount upload.',
    tat: 'Same day', countries: 'Australia',
    kpis: [['Same day', 'Certificate'], ['2', 'Govt-approved funds'], ['100%', 'Visa-ready']],
    about: 'Overseas Student Health Cover (OSHC) and Overseas Visitor Health Cover (OVHC) from government-approved providers: the certificate uploads directly to ImmiAccount.',
    feats: ['Medibank & nib: approved providers', 'Single, couple & family coverage', 'Certificates accepted by ImmiAccount', 'Policy matched exactly to visa length', 'Priority claims assistance after landing'],
    partners: ['Medibank', 'nib'],
    partnerTypes: ['Approved OSHC Fund', 'Approved OSHC Fund'],
    steps: ['Share the CoE and visa duration', 'Get matched OSHC quotes instantly', 'Pay online: certificate issued same day', 'Payout credited on premium payment'],
    related: ['sim-cards', 'education-loans', 'canada-gic'],
  },
  {
    key: 'accommodation', icon: ICONS.housing, sub: 'Arrival', name: 'Student Accommodation', img: 'svc-accom.jpg', green: true, flags: ['gb', 'ca', 'au'], flagLabel: '50+ cities',
    short: 'Verified housing near campus, booked before departure.',
    cardText: 'Verified beds near campus across 50+ cities: booked before they fly.',
    tat: '48–72 hrs', countries: 'UK · Canada · Australia · EU',
    kpis: [['1M+', 'Verified beds'], ['50+', 'Cities covered'], ['48–72h', 'Booking time']],
    about: 'Purpose-built student apartments and verified private rentals near campus, compared, reserved and contracted before the student boards the flight.',
    feats: ['Studios, en-suites & shared apartments', 'Options typically $400–$1,500 per month', 'Virtual tours & roommate matching', 'Guarantor & instalment plan support', 'Move-in assistance after landing'],
    partners: ['Verified PBSA network'],
    partnerTypes: ['Global PBSA Network'],
    steps: ['Share university, budget & move-in date', 'Shortlist with virtual tours in 48 hours', 'Contract signed & deposit paid remotely', 'Confirmation shared: payout credited on check-in'],
    related: ['education-loans', 'canada-gic', 'german-blocked-account'],
  },
  {
    key: 'sim-cards', icon: ICONS.sim, sub: 'Arrival', name: 'International SIM Cards', img: 'svc-sim.jpg', green: false, flags: ['ca', 'gb', 'us', 'de'], flagLabel: '4 markets',
    short: 'Pre-activated SIMs, connected the moment they land.',
    cardText: 'Pre-activated destination SIMs: connected the moment the flight lands.',
    tat: '3–5 days', countries: 'Canada · UK · USA · Germany',
    kpis: [['3–5d', 'Home delivery'], ['4', 'Carrier networks'], ['Day 0', 'Connectivity']],
    about: 'Destination-country SIMs on leading carriers, delivered to the student’s Indian address and active before the flight lands.',
    feats: ['Vodafone, Rogers & Telus networks', 'Pre-activated with a local number', 'Unlimited call & high-data plans', 'Number reserved before travel', 'Easy plan upgrades after landing'],
    partners: ['Vodafone', 'Rogers', 'Telus'],
    partnerTypes: ['Carrier Network', 'Carrier Network', 'Carrier Network'],
    steps: ['Pick destination & plan with the student', 'KYC completed in 2 minutes', 'SIM delivered in 3–5 days, pre-activated', 'Payout credited on activation'],
    related: ['canada-gic', 'german-blocked-account', 'fee-payments'],
  },
];

export const serviceByKey = (key: string) => SERVICES.find((s) => s.key === key);
export const serviceName = (key: string) => serviceByKey(key)?.name ?? key;

export const DESTINATIONS = ['Canada', 'United Kingdom', 'United States', 'Germany', 'Australia', 'UAE', 'France', 'Ireland', 'Hungary', 'New Zealand'];

/** Two-letter monogram for partner logo tiles */
export const monogram = (name: string) => {
  const words = name.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
};
