/* Service catalogue + commission structures */

export interface Service {
  key: string;
  icon: string; // icon key, mapped to a glyph by the client
  category: 'Funding & Forex' | 'Banking' | 'Insurance' | 'Arrival';
  name: string;
  short: string;
  about: string;
  tat: string;
  countries: string;
  kpis: [string, string][];
  features: string[];
  partners: string[];
  steps: string[];
  commission: { amount: string; note: string };
  documents: string[]; // documents requested when a case is opened
}

export const SERVICES: Service[] = [
  {
    key: 'education-loans', icon: 'loan', category: 'Funding & Forex', name: 'Education Loans',
    short: 'Secured & unsecured study loans from ₹5 lakh to ₹1.5 crore.',
    about: 'Collateral and non-collateral education loans covering tuition, living costs, travel and forex, matched to the right lender so every student file reaches sanction before the visa deadline.',
    tat: '7–14 days', countries: 'All destinations',
    kpis: [['₹1.5 Cr', 'Max sanction'], ['14+', 'Lending partners'], ['7–14d', 'Sanction time']],
    features: ['Loan up to ₹1.5 Cr with collateral', 'Up to ₹75 lakh unsecured on profile', 'Interest concessions for meritorious students', 'Sanction letter accepted for visa filing', 'Moratorium & flexible repayment', 'Doorstep documentation support'],
    partners: ['SBI', 'Bank of Baroda', 'PNB', 'Union Bank', 'Axis Bank', 'ICICI Bank', 'YES Bank', 'IDFC First', 'HDFC Credila', 'Avanse', 'Auxilo', 'Tata Capital', 'Poonawalla Fincorp', 'Prodigy Finance'],
    steps: ['Share the student profile and admit letter', 'We match 3–4 best-fit lenders the same day', 'Documentation, follow-ups and query handling', 'Sanction letter issued: commission credited on disbursal'],
    commission: { amount: '0.75–1.25%', note: 'of disbursed amount' },
    documents: ['KYC & income docs', 'Offer letter', 'Fee structure'],
  },
  {
    key: 'canada-gic', icon: 'gic', category: 'Banking', name: 'Canada GIC',
    short: 'Guaranteed Investment Certificate for the Student Direct Stream.',
    about: 'Full GIC setup for SDS and non-SDS applicants: account opening, CAD 23,448 transfer guidance and the Investment Declaration needed for the Canadian study permit.',
    tat: '5–7 days', countries: 'Canada',
    kpis: [['CAD 23,448', 'Min. deposit'], ['4', 'GIC banks'], ['5–7d', 'Certificate time']],
    features: ['CIBC, BMO, ICICI Bank Canada & Beacon Money', 'SDS-compliant investment declaration', 'Wire transfer & FX guidance for the deposit', 'Refund-friendly process if the visa is refused', 'Activation support after landing in Canada'],
    partners: ['CIBC', 'BMO', 'ICICI Bank Canada', 'Beacon Money'],
    steps: ['Choose the GIC bank with the student', 'Account opened & wiring details shared in 48h', 'Student remits CAD 23,448 + fees', 'GIC certificate issued in 5–7 days: payout credited on funding'],
    commission: { amount: 'CAD 175–225', note: 'per funded GIC account' },
    documents: ['Student passport', 'University offer letter', 'SDS fund checklist'],
  },
  {
    key: 'german-blocked-account', icon: 'blocked', category: 'Banking', name: 'German Blocked Account',
    short: 'Expatrio-powered Sperrkonto for the German student visa.',
    about: 'Blocked account, health insurance and free current account bundled through Expatrio, with the instant confirmation letter German consulates require.',
    tat: '3–5 days', countries: 'Germany',
    kpis: [['€11,904', 'Annual amount'], ['€992/mo', 'Payout schedule'], ['3–5d', 'Confirmation']],
    features: ['0€ account-opening fee options', 'Instant confirmation letter for visa', 'Bundled incoming + statutory health insurance', 'Payouts of €992 per month, visa-compliant', 'Extension letters for later semesters'],
    partners: ['Expatrio'],
    steps: ['Student registers with passport & admit letter', 'Transfers €11,904 to the assigned IBAN', 'Confirmation letter generated within 3–5 days', 'Activation & payout setup on arrival: payout credited on funding'],
    commission: { amount: 'EUR 35', note: 'per funded blocked account' },
    documents: ['Student passport', 'Admission letter', 'Expatrio form'],
  },
  {
    key: 'fee-payments', icon: 'remit', category: 'Funding & Forex', name: 'Fee Payment & Remittance',
    short: 'Tuition & living-cost transfers at competitive FX rates.',
    about: 'RBI-compliant outward remittance under LRS for tuition, deposits and student living costs, with university receipt tracking and better rates than bank counters.',
    tat: '2–3 days', countries: 'All destinations',
    kpis: [['2–3d', 'Credit time'], ['4', 'Payment rails'], ['0', 'Hidden charges']],
    features: ['Flywire, Convera, PayMyTuition & TransferMate rails', 'Live interbank-linked FX rates', 'TCS & LRS documentation handled', 'University confirmation shared with agent', 'Same-rail transfers for hostel & GIC deposits'],
    partners: ['Flywire', 'Convera', 'PayMyTuition', 'TransferMate'],
    steps: ['Upload the university fee invoice', 'Student transfers INR: rate locked live', 'University credited in 2–3 working days', 'Receipt shared: commission credited on completion'],
    commission: { amount: '0.4%', note: 'of transfer value · min ₹800' },
    documents: ['Student passport', 'University fee invoice', 'KYC form'],
  },
  {
    key: 'forex-card', icon: 'forex', category: 'Funding & Forex', name: 'Multi-Currency Forex Card',
    short: 'One prepaid card carrying 14+ currencies, loaded from India.',
    about: 'A student-first prepaid forex card with interbank-linked loads, app control and instant reloads: safer and cheaper than carrying currency.',
    tat: '24–48 hrs', countries: 'All destinations',
    kpis: [['14+', 'Currencies'], ['24–48h', 'Card delivery'], ['0%*', 'Markup plans']],
    features: ['14+ currencies on a single card', 'Card delivered before departure', 'Reload anytime from the app', 'ATM withdrawals & POS spending worldwide', 'Complimentary travel insurance on select plans'],
    partners: ['EbixCash', 'Thomas Cook'],
    steps: ['Submit KYC and travel details', 'Choose load currency & amount: CAD 300+ starter packs', 'Card delivered and loaded in 24–48 hours', 'Payout credited on first successful load'],
    commission: { amount: '₹1,000', note: 'per first successful load' },
    documents: ['Student passport', 'KYC form', 'Visa copy'],
  },
  {
    key: 'insurance', icon: 'insurance', category: 'Insurance', name: 'Travel & Student Insurance',
    short: 'Visa-compliant medical and travel cover, worldwide.',
    about: 'Comprehensive student medical and travel policies accepted by universities and consulates, issued the same day and emailed straight to the student.',
    tat: 'Same day', countries: 'All destinations',
    kpis: [['Same day', 'Policy issue'], ['3+', 'Insurers'], ['100%', 'Visa-compliant']],
    features: ['Allianz Care, ICICI Lombard & Tata AIG', 'University waiver-friendly plans', 'Covers hospitalisation, baggage & sponsors', 'Refund if visa is refused (T&C apply)', 'Instant policy certificate by email'],
    partners: ['Allianz Care', 'ICICI Lombard', 'Tata AIG'],
    steps: ['Share destination, course start & duration', 'Pick the plan matched to visa rules', 'Pay online: policy issued same day', 'Payout credited on premium payment'],
    commission: { amount: '50%', note: 'of net premium' },
    documents: ['Student passport', 'Offer letter'],
  },
  {
    key: 'oshc-ovhc', icon: 'oshc', category: 'Insurance', name: 'OSHC / OVHC',
    short: 'Mandatory health cover for Australian student & visitor visas.',
    about: 'Overseas Student Health Cover (OSHC) and Overseas Visitor Health Cover (OVHC) from government-approved providers: the certificate uploads directly to ImmiAccount.',
    tat: 'Same day', countries: 'Australia',
    kpis: [['Same day', 'Certificate'], ['2', 'Govt-approved funds'], ['100%', 'Visa-ready']],
    features: ['Medibank & nib, both approved providers', 'Single, couple & family coverage', 'Certificates accepted by ImmiAccount', 'Policy matched exactly to visa length', 'Priority claims assistance after landing'],
    partners: ['Medibank', 'nib'],
    steps: ['Share the CoE and visa duration', 'Get matched OSHC quotes instantly', 'Pay online: certificate issued same day', 'Payout credited on premium payment'],
    commission: { amount: '₹1,500', note: 'per issued policy' },
    documents: ['Student passport', 'Confirmation of Enrolment'],
  },
  {
    key: 'accommodation', icon: 'housing', category: 'Arrival', name: 'Student Accommodation',
    short: 'Verified housing near campus, booked before departure.',
    about: 'Purpose-built student apartments and verified private rentals near campus, compared, reserved and contracted before the student boards the flight.',
    tat: '48–72 hrs', countries: 'UK · Canada · Australia · EU',
    kpis: [['1M+', 'Verified beds'], ['50+', 'Cities covered'], ['48–72h', 'Booking time']],
    features: ['Studios, en-suites & shared apartments', 'Options typically $400–$1,500 per month', 'Virtual tours & roommate matching', 'Guarantor & instalment plan support', 'Move-in assistance after landing'],
    partners: ['Verified PBSA network'],
    steps: ['Share university, budget & move-in date', 'Shortlist with virtual tours in 48 hours', 'Contract signed & deposit paid remotely', 'Confirmation shared: payout credited on check-in'],
    commission: { amount: '₹5,000', note: 'per confirmed booking' },
    documents: ['Student passport', 'Offer letter'],
  },
  {
    key: 'sim-cards', icon: 'sim', category: 'Arrival', name: 'International SIM Cards',
    short: 'Pre-activated SIMs, connected the moment they land.',
    about: 'Destination-country SIMs on leading carriers, delivered to the student’s Indian address and active before the flight lands.',
    tat: '3–5 days', countries: 'Canada · UK · USA · Germany',
    kpis: [['3–5d', 'Home delivery'], ['4', 'Carrier networks'], ['Day 0', 'Connectivity']],
    features: ['Vodafone, Rogers & Telus networks', 'Pre-activated with a local number', 'Unlimited call & high-data plans', 'Number reserved before travel', 'Easy plan upgrades after landing'],
    partners: ['Vodafone', 'Rogers', 'Telus'],
    steps: ['Pick destination & plan with the student', 'KYC completed in 2 minutes', 'SIM delivered in 3–5 days, pre-activated', 'Payout credited on activation'],
    commission: { amount: '₹1,000–4,000', note: 'per activated SIM' },
    documents: ['Student passport', 'KYC form'],
  },
];

export const serviceByKey = (key: string) => SERVICES.find((s) => s.key === key);

export const DESTINATIONS = ['Canada', 'United Kingdom', 'United States', 'Germany', 'Australia', 'UAE', 'France', 'Ireland', 'Hungary', 'New Zealand'];
export const ZONES = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
