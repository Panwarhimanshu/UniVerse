/* Search-focused copy for the public pages: page titles, meta descriptions, the long-form guide on each service page
   and the FAQs (also published as FAQPage structured data). Figures are checked against official sources as of
   October 2026; update them here when a government changes an amount. */

export interface Faq { q: string; a: string }
export interface ServiceSeo {
  title: string; // <title>, up to ~60 characters
  description: string; // meta description, up to ~155 characters
  h1: string;
  guideHeading: string;
  guide: string[];
  faqs: Faq[];
}

export const HOME_SEO = {
  title: 'B2B Study Abroad Services Platform for Consultants | UniVerse',
  description:
    'One partner for education loans, Canada GIC, German blocked accounts, forex, insurance, OSHC and student housing. Built for Indian education consultants.',
};

/** Home: "value added services explained" block */
export const HOME_GUIDE: { h: string; p: string }[] = [
  {
    h: 'What are study abroad value added services?',
    p: 'Between the offer letter and the first day of class, every outbound student needs the same set of services: an education loan or proof of funds, a Canada GIC or German blocked account, tuition fee remittance, a forex card, travel or student health insurance (OSHC for Australia), accommodation near campus and a local SIM. These are the value added services (VAS) that sit around the admission itself.',
  },
  {
    h: 'Why education consultants offer them',
    p: 'Students and parents trust the consultant who handled the admission, so offering these services keeps the whole journey in one place, avoids last-minute visa delays caused by missing documents, and adds a second income stream on every file. Handling nine separate vendors is the hard part, and UniVerse removes it.',
  },
  {
    h: 'How the UniVerse partner programme works',
    p: 'Register your consultancy, complete KYC and sign the channel partner agreement online. Then refer students from your dashboard: a specialist desk works with the banks, insurers and providers, you track each case live, and your commission is credited to your wallet when the service completes. Student records stay locked to your account and are never shared with another consultant.',
  },
];

export const HOME_FAQ: Faq[] = [
  { q: 'What exactly is UniVerse?', a: 'UniVerse is a B2B value added services marketplace for immigration consultants and education agents in India. It brings nine study abroad services together on one platform: education loans, Canada GIC, German blocked accounts, fee remittance, forex cards, student insurance, OSHC, accommodation and international SIM cards. You work with one partner instead of nine vendors.' },
  { q: 'Will my student data be shared with competing consultants?', a: 'No. Student records you submit are ring-fenced to your account and are never visible to, or shared with, another consultant on the platform. UniVerse is a service provider, not a recruitment competitor.' },
  { q: 'How do education consultants earn with UniVerse?', a: 'You earn a commission on every completed service. Each service has a clear payout trigger, such as a disbursed loan, a funded GIC, an issued policy or an activated SIM, and the commission is credited to your UniVerse wallet. You can withdraw it to your bank account; TDS applies as required by the Income-tax Act.' },
  { q: 'How do I become a UniVerse partner?', a: 'Apply online with your contact details, then complete KYC as an individual (PAN and Aadhaar) or as an entity (PAN plus GST or MSME registration). Our team verifies your details and emails the channel partner agreement within 48 hours. Once you sign it online, you can sign in and start referring students.' },
  { q: 'How much money does a student need to show for a Canada study permit in 2026?', a: 'For applications submitted on or after 1 September 2026, IRCC asks a single applicant outside Quebec to show CAD 23,448 for living expenses, plus first-year tuition and travel costs. Many students show this through a Guaranteed Investment Certificate (GIC).' },
  { q: 'What is the German blocked account amount for 2026?', a: 'Students applying for a German student visa usually deposit €11,904 for 12 months in a blocked account (Sperrkonto), which releases €992 per month after arrival. Confirm the current figure with the German mission before transferring funds.' },
  { q: 'Is TCS charged on money sent abroad for education?', a: 'From 1 April 2026, education remittances funded by a loan from a recognised lender carry no TCS. Self-funded education remittances attract 2% TCS on the amount above ₹10 lakh in a financial year, and the TCS can be claimed against income tax.' },
  { q: 'How long do the services take?', a: 'It varies by service: same day for student insurance and OSHC certificates, 24–48 hours for forex cards, 2–3 working days for fee remittance, 3–5 days for blocked accounts and SIM delivery, 5–7 days for a Canada GIC and 7–14 days for an education loan sanction.' },
];

export const SERVICE_SEO: Record<string, ServiceSeo> = {
  'education-loans': {
    title: 'Education Loan for Study Abroad: Consultant Partner | UniVerse',
    description: 'Secured and unsecured study abroad education loans up to ₹1.5 crore from 14+ banks and NBFCs, sanctioned in 7–14 days. Consultants earn on every disbursal.',
    h1: 'Education Loans for Study Abroad',
    guideHeading: 'Study abroad education loans: a guide for consultants',
    guide: [
      'An overseas education loan covers tuition, living costs, travel and related expenses for a student admitted to a recognised university abroad. Public-sector banks such as SBI, Bank of Baroda and PNB usually offer the lowest rates on secured loans backed by property or fixed deposits, while NBFCs such as HDFC Credila, Avanse, Auxilo and Tata Capital lend without collateral against the admit, the course and the co-applicant’s income.',
      'The right lender depends on three things: the university and course, the co-applicant’s income and credit history, and whether collateral is available. Sending a file to the wrong lender segment first costs weeks and adds credit enquiries, so UniVerse matches each profile to three or four suitable lenders on the day you share it, then handles documents and follow-ups until sanction.',
      'Most visa offices accept a sanction letter from a recognised lender as proof of funds, and education remittances funded by such a loan carry no TCS. Your commission is credited to your UniVerse wallet when the loan is disbursed.',
    ],
    faqs: [
      { q: 'How much education loan can a student get to study abroad?', a: 'Secured loans can reach about ₹1.5 crore depending on the lender and collateral, and unsecured loans up to about ₹75 lakh for strong profiles. The final amount depends on the course cost, the university, the co-applicant’s income and the collateral offered.' },
      { q: 'Can a student get an education loan without collateral?', a: 'Yes. NBFCs and some private banks give unsecured education loans based on the admit, the course and the co-applicant’s income and credit score. Interest rates are usually higher than on secured loans from public-sector banks.' },
      { q: 'Is TCS charged when education loan money is sent abroad?', a: 'No. From 1 April 2026, education remittances funded by a loan from a recognised financial institution carry no TCS. Self-funded education remittances attract 2% TCS above ₹10 lakh in a financial year.' },
      { q: 'When does the consultant earn the commission on an education loan?', a: 'The commission is credited to your UniVerse wallet when the lender disburses the loan. You can then withdraw it to your bank account.' },
    ],
  },
  'canada-gic': {
    title: 'Canada GIC for Indian Students 2026 (CAD 23,448) | UniVerse',
    description: 'Set up a Canada GIC with CIBC, BMO, ICICI Bank Canada or Beacon Money for study permit proof of funds: CAD 23,448 from 1 Sept 2026. Certificate in 5–7 days.',
    h1: 'Canada GIC for Study Permit Applicants',
    guideHeading: 'Canada GIC in 2026: what consultants should tell students',
    guide: [
      'A Guaranteed Investment Certificate (GIC) is a deposit with a participating Canadian bank that students use to prove living-expense funds for a Canadian study permit. For applications submitted on or after 1 September 2026, IRCC requires CAD 23,448 for a single applicant outside Quebec, up from CAD 22,895. First-year tuition and travel costs must be shown on top of this amount, and Quebec sets its own figures.',
      'The Student Direct Stream (SDS) closed on 8 November 2024, so every applicant now goes through the regular study permit process. A GIC is no longer tied to a special stream, but it remains one of the most widely used and easily verified ways to prove funds, alongside bank statements, education loans and scholarships.',
      'After the student arrives and verifies their identity, the bank releases an initial amount and pays the balance in instalments, so the GIC is the student’s own money, not a fee. If the study permit is refused, the bank refunds the deposit, less any charges, once the refusal letter and refund forms are submitted.',
    ],
    faqs: [
      { q: 'What is the GIC amount for Canada in 2026?', a: 'For study permit applications submitted on or after 1 September 2026, a single applicant outside Quebec must show CAD 23,448 for living expenses. Applications submitted between 1 January 2025 and 31 August 2026 used CAD 22,895. Tuition and travel are extra.' },
      { q: 'Is a GIC mandatory for a Canada study permit?', a: 'No. Since the Student Direct Stream closed in November 2024, a GIC is one accepted way to prove funds, along with bank statements, education loans and scholarships. Many consultants still recommend it because officers can verify it easily.' },
      { q: 'Which banks offer a GIC for international students?', a: 'Several Canadian banks run student GIC programmes. UniVerse works with CIBC, BMO and ICICI Bank Canada, and with Beacon Money for an alternative route.' },
      { q: 'What happens to the GIC if the study permit is refused?', a: 'The bank refunds the deposit to the student, less any bank charges, after receiving the refusal letter and the signed refund forms. The UniVerse desk prepares the bank-specific refund pack for you.' },
    ],
  },
  'german-blocked-account': {
    title: 'German Blocked Account 2026 (€11,904) for Students | UniVerse',
    description: 'Open a German blocked account (Sperrkonto) through Expatrio: €11,904 for 12 months, €992 released monthly, visa confirmation letter in 3–5 days.',
    h1: 'German Blocked Account (Sperrkonto)',
    guideHeading: 'German blocked account in 2026: the essentials',
    guide: [
      'Students applying for a German student visa usually prove they can cover their living costs by depositing funds in a blocked account (Sperrkonto). The required amount is currently €11,904 for 12 months, or €992 per month. The figure follows the BAföG student grant rate, so confirm it with the German mission before the student transfers money.',
      'Once the account is funded, the provider issues a confirmation letter for the visa file. After the student arrives and registers an address in Germany, €992 is released into a German current account each month, and the rest stays locked until it is paid out.',
      'UniVerse opens blocked accounts through Expatrio, which can bundle the account with the health insurance needed for enrolment and the residence permit. Your commission is credited once the account is funded.',
    ],
    faqs: [
      { q: 'How much money is needed in a German blocked account in 2026?', a: 'Students need €11,904 for 12 months, equal to €992 per month. Some other visa types, such as the Opportunity Card, require a higher monthly amount. Check the current figure with the German mission before transferring funds.' },
      { q: 'How long does the blocked account confirmation take?', a: 'The confirmation letter is usually ready within 3–5 working days of the funds reaching the account.' },
      { q: 'Can the student withdraw money from the blocked account?', a: 'Yes, but only after arrival. Once the student registers an address and activates the account, €992 is released each month into a German current account.' },
      { q: 'Are there alternatives to a blocked account for Germany?', a: 'Yes. A scholarship letter, for example from DAAD, that covers the monthly amount, or a formal obligation letter (Verpflichtungserklärung) from a sponsor living in Germany, can replace the blocked account.' },
    ],
  },
  'fee-payments': {
    title: 'Pay University Fees Abroad from India | UniVerse Remittance',
    description: 'Send tuition and living-cost payments abroad under LRS through Flywire, Convera, PayMyTuition or TransferMate. Credited in 2–3 working days, with a receipt.',
    h1: 'Tuition Fee Payment & Education Remittance',
    guideHeading: 'Paying overseas tuition from India: LRS, TCS and payment rails',
    guide: [
      'Indian residents can send money abroad for education under the Reserve Bank of India’s Liberalised Remittance Scheme (LRS), which allows up to USD 250,000 per person per financial year across all purposes. Payment platforms such as Flywire, Convera, PayMyTuition and TransferMate are connected to many universities, so the payment reaches the right account with the student’s reference attached and the university confirms it faster than a plain bank wire.',
      'Tax collected at source (TCS) applies to education remittances. From 1 April 2026, payments funded by an education loan from a recognised lender carry no TCS, while self-funded payments attract 2% TCS on the amount above ₹10 lakh in a financial year. The ₹10 lakh threshold counts all LRS remittances together. TCS is not a fee: the payer can claim it against income tax.',
      'UniVerse collects the fee invoice, locks a live exchange rate, handles the LRS declaration and Form A2, and shares the university receipt with you. The same route works for hostel deposits and GIC funding. Your commission is credited once the payment completes.',
    ],
    faqs: [
      { q: 'How can I pay university fees abroad from India?', a: 'Through a bank wire or an international payment platform under the Liberalised Remittance Scheme. You need the student’s PAN, the admission or fee invoice and a signed Form A2. Payment platforms usually give better rates and faster university confirmation than a bank counter.' },
      { q: 'Is TCS charged on tuition fee payments abroad?', a: 'From 1 April 2026, loan-funded education payments carry no TCS. Self-funded payments attract 2% TCS on the amount above ₹10 lakh in a financial year, and the TCS can be claimed against income tax.' },
      { q: 'How long does an international tuition payment take?', a: 'Usually 2–3 working days for the university to receive the funds, depending on the payment rail and the destination country.' },
      { q: 'What is the LRS limit for education?', a: 'The Liberalised Remittance Scheme allows each resident Indian to remit up to USD 250,000 per financial year, shared across all purposes including education.' },
    ],
  },
  'forex-card': {
    title: 'Student Forex Card for Studying Abroad | UniVerse',
    description: 'A prepaid multi-currency forex card for students: 14+ currencies, rate locked when loaded, delivered within 24–48 hours of KYC and reloadable online by parents.',
    h1: 'Multi-Currency Student Forex Card',
    guideHeading: 'Forex cards for students: why they beat cash and debit cards',
    guide: [
      'A student forex card is a prepaid card loaded in foreign currency before departure. Because the exchange rate is fixed when the card is loaded, the student is protected from currency swings and avoids the markup and fees that Indian debit and credit cards add to every foreign transaction.',
      'Cards from issuers such as EbixCash and Thomas Cook hold 14 or more currencies, work at ATMs and shops worldwide, and can be reloaded online by parents in India. They are the simplest way to cover the first weeks abroad, before the student opens a local bank account.',
      'Loading a card is a remittance under LRS, so the usual PAN and passport KYC applies. UniVerse arranges the KYC, loading and delivery within 24–48 hours, and your commission is credited on the first successful load.',
    ],
    faqs: [
      { q: 'What is a forex card for students?', a: 'A prepaid card loaded in one or more foreign currencies in India before the student travels. It is used for ATM withdrawals and card payments abroad at the rate locked at the time of loading.' },
      { q: 'Is a forex card better than an international debit card?', a: 'Usually, yes. The rate is locked when the card is loaded and cross-currency markups are lower, while an Indian debit or credit card adds a markup and fees on every foreign transaction.' },
      { q: 'How long does it take to get a forex card?', a: 'The card is usually loaded and delivered within 24–48 hours of completing KYC.' },
      { q: 'Can parents reload the forex card from India?', a: 'Yes. The card can be reloaded online at any time, so parents can add money while the student is abroad.' },
    ],
  },
  insurance: {
    title: 'Student Travel & Health Insurance for Study Abroad | UniVerse',
    description: 'Student medical and travel insurance from Allianz Care, ICICI Lombard and Tata AIG, matched to university and visa rules and issued the same day.',
    h1: 'Student Travel & Health Insurance',
    guideHeading: 'Student travel insurance: what it covers and when it is required',
    guide: [
      'Student travel and medical insurance covers hospitalisation, emergency treatment, medical evacuation, loss of baggage or passport and personal liability while the student lives abroad. Many universities ask for proof of cover at enrolment, and some countries require health insurance for the visa or residence permit. Australia is a special case: students there need OSHC instead.',
      'Indian insurers such as ICICI Lombard and Tata AIG offer plans designed for students, while international insurers such as Allianz Care offer cover that some universities accept as a waiver of their own campus health plan. The right plan depends on the destination, the university’s minimum requirements and the length of the course.',
      'UniVerse matches the plan to the university and visa rules, issues the policy the same day and emails the certificate to the student. Your commission is credited when the premium is paid.',
    ],
    faqs: [
      { q: 'Is travel insurance mandatory for Indian students going abroad?', a: 'It depends on the country and the university. Many universities require health cover at enrolment and some visas require it, and it is strongly recommended everywhere because medical costs abroad are high.' },
      { q: 'Can student insurance replace the university health plan?', a: 'Some universities, especially in the USA, let students waive the campus plan if their own policy meets the university’s minimum cover. Check the waiver criteria before buying.' },
      { q: 'How quickly is the student insurance policy issued?', a: 'The same day. The certificate is emailed to the student as soon as the premium is paid.' },
      { q: 'Does student insurance cover a visa refusal?', a: 'Some plans refund the premium if the visa is refused, subject to the insurer’s terms. We point out these plans when you request a quote.' },
    ],
  },
  'oshc-ovhc': {
    title: 'OSHC for Australian Student Visas (Medibank, nib) | UniVerse',
    description: 'Buy Overseas Student Health Cover (OSHC) from approved insurers Medibank and nib, matched to the full student visa length. Certificate issued the same day.',
    h1: 'OSHC / OVHC for Australia',
    guideHeading: 'OSHC explained: the health cover every Australian student visa needs',
    guide: [
      'Overseas Student Health Cover (OSHC) is mandatory for Australian student visa (subclass 500) holders. It must come from an approved insurer, be in place when the visa is lodged and run for the full length of the visa, not just the course. Letting the cover lapse breaches a visa condition.',
      'OSHC contributes to doctor visits, hospital treatment, ambulance cover and some prescription medicines. Couples and families need couple or family cover so that everyone on the visa is insured. Overseas Visitor Health Cover (OVHC) is the equivalent for visitors and many temporary graduate visa holders.',
      'With the visa application, students must also show funds for living costs (AUD 29,710 a year for the main applicant), tuition and travel. UniVerse quotes OSHC from Medibank and nib, matches the dates to the expected visa length and issues the certificate the same day. Your commission is credited when the premium is paid.',
    ],
    faqs: [
      { q: 'Is OSHC mandatory for an Australian student visa?', a: 'Yes. Student visa (subclass 500) holders must have OSHC from an approved insurer for the whole time they are in Australia on that visa.' },
      { q: 'How long should OSHC cover the student?', a: 'For the full visa period, which is usually the course length plus a few extra months. The cover should match the visa dates, not just the course dates.' },
      { q: 'How much does OSHC cost?', a: 'It depends on the insurer, the plan and the length of cover. Single cover typically costs around AUD 500–700 a year; couple and family cover costs more.' },
      { q: 'Which OSHC providers can students choose?', a: 'Only insurers approved by the Australian Government can sell OSHC. UniVerse offers cover from Medibank and nib, both approved providers.' },
    ],
  },
  accommodation: {
    title: 'Student Accommodation Abroad Near Campus | UniVerse',
    description: 'Book verified student accommodation near campus in the UK, Canada, Australia and Europe before departure: studios, en-suites and shared flats in 50+ cities.',
    h1: 'Student Accommodation Abroad',
    guideHeading: 'Booking student housing abroad before the student flies',
    guide: [
      'Students usually choose between purpose-built student accommodation (PBSA), university halls and private rentals. PBSA buildings are close to campus, include bills and furniture, and accept international students without a local rental history, which makes them the easiest option to book from India.',
      'Rooms near popular universities fill up early before each intake, and private landlords often ask for a local guarantor. Booking early, with a contract and deposit settled online, gives the student a confirmed address before departure. That address is also needed to open a bank account and to register locally after arrival.',
      'UniVerse shortlists verified options within the student’s budget in 48 hours, arranges virtual tours, and completes the contract and deposit remotely. Your commission is credited when the student checks in.',
    ],
    faqs: [
      { q: 'When should students book accommodation abroad?', a: 'As soon as the offer is confirmed. Rooms near popular universities fill up months before each intake, and early bookings get better rooms and prices.' },
      { q: 'What is purpose-built student accommodation (PBSA)?', a: 'Residences built for students, usually near campus, with furnished rooms, bills included and on-site support. They accept international students without a local guarantor or rental history.' },
      { q: 'Do international students need a guarantor to rent?', a: 'Private landlords often ask for one. PBSA providers usually accept a guarantor service or rent paid in advance instead.' },
      { q: 'How much does student accommodation abroad cost?', a: 'It varies widely by city and room type. Options typically range from about $400 to $1,500 per month, with shared flats at the lower end and studios in major cities at the top.' },
    ],
  },
  'sim-cards': {
    title: 'International SIM Card for Students Going Abroad | UniVerse',
    description: 'Pre-activated SIM cards for Canada, the UK, the USA and Germany, delivered to the student’s home in India in 3–5 days. A working local number from landing.',
    h1: 'International SIM Cards for Students',
    guideHeading: 'Why students should land with a working local SIM',
    guide: [
      'The first hours abroad depend on a phone: calling the airport pickup or landlord, receiving bank and university OTPs, using maps and staying in touch with family. A local number is also needed to open a bank account, sign a tenancy and apply for part-time work.',
      'A pre-activated SIM is delivered to the student’s home in India, so the local number is known before travel and can be shared with the university and the landlord. It works as soon as the plane lands, with no airport queues or foreign-card payments.',
      'UniVerse offers SIMs on leading networks for Canada, the UK, the USA and Germany. KYC takes about two minutes, delivery takes 3–5 days, and your commission is credited when the SIM is activated.',
    ],
    faqs: [
      { q: 'Can I buy a foreign SIM card in India before travelling?', a: 'Yes. A pre-activated international SIM can be ordered in India and delivered to the student’s home within 3–5 days, with the local number shared in advance.' },
      { q: 'Will the SIM work as soon as the student lands?', a: 'Yes. The SIM is activated before departure, so calls, texts and data work on arrival.' },
      { q: 'Which countries are covered?', a: 'Canada, the United Kingdom, the United States and Germany.' },
      { q: 'Can the plan be changed after arrival?', a: 'Yes. Students can upgrade or change their plan with the carrier after they land.' },
    ],
  },
};
