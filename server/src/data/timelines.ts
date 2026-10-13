/* Case stages per service. The desk moves a case forward one stage at a time from the back office. */

export const TIMELINES: Record<string, [string, string][]> = {
  'canada-gic': [['Case submitted', 'By you'], ['Documents verified', 'GIC desk'], ['Bank account opened', 'Wiring details shared with student'], ['Awaiting CAD 23,448 transfer', 'Student to remit'], ['GIC certificate issued', 'Commission credited at this step']],
  'german-blocked-account': [['Case submitted', 'By you'], ['Documents verified', 'Blocked account desk'], ['IBAN assigned to student', 'Expatrio portal'], ['Awaiting €11,904 deposit', 'Student to remit'], ['Confirmation letter issued', 'Commission credited at this step']],
  'oshc-ovhc': [['Case submitted', 'By you'], ['CoE & visa duration verified', 'OSHC desk'], ['Plan matched, payment link sent', 'Quote shared with student'], ['Awaiting premium payment', 'Student to pay'], ['Certificate issued', 'Commission credited at this step']],
  'education-loans': [['Case submitted', 'By you'], ['Profile matched to lenders', '3 to 4 best-fit lenders'], ['Documentation in progress', 'Loan desk'], ['Sanction letter issued', 'Accepted for visa filing'], ['Loan disbursed', 'Commission credited at this step']],
  'forex-card': [['Case submitted', 'By you'], ['KYC verified', 'Forex desk'], ['Card ordered', 'Card issuer'], ['Card loaded and dispatched', 'Tracking shared'], ['First load completed', 'Commission credited at this step']],
  'fee-payments': [['Case submitted', 'By you'], ['Fee invoice verified', 'Remittance desk'], ['Rate locked, transfer sent', 'Payment rail'], ['Awaiting university credit', 'Usually 2 to 3 working days'], ['Receipt shared', 'Commission credited at this step']],
  insurance: [['Case submitted', 'By you'], ['Plan matched to visa rules', 'Insurance desk'], ['Awaiting payment', 'Payment link sent'], ['Policy issued', 'Emailed to student'], ['Premium confirmed', 'Commission credited at this step']],
  accommodation: [['Case submitted', 'By you'], ['Shortlist shared with student', 'Housing partner'], ['Viewing and selection', 'Virtual tour'], ['Contract and deposit', 'Signed remotely'], ['Booking confirmed', 'Commission credited at this step']],
  'sim-cards': [['Case submitted', 'By you'], ['KYC completed', 'SIM desk'], ['SIM dispatched', 'Courier booked'], ['SIM delivered', 'Pre-activated'], ['SIM activated', 'Commission credited at this step']],
};

export const LAST_STEP = 4;
const PROGRESS = [10, 30, 55, 80, 100];
export const progressFor = (step: number) => PROGRESS[Math.max(0, Math.min(LAST_STEP, step))];
export const stepsFor = (service: string) => TIMELINES[service] ?? TIMELINES['canada-gic'];
