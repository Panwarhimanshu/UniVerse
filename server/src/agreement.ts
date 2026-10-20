import crypto from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getSettings, isServiceHidden } from './content.js';
import { SERVICES } from './data/catalog.js';
import { drawSignature, INK, money, NAVY, plain, SOFT, Writer } from './pdf.js';

/* The UniVerse Channel Partner Agreement, following the company's reference copy, with the clauses on claims,
   reporting, discrepancies and student-ownership disputes added. Filled from the partner's KYC details and the
   Commission Structure in force, sent for signature, then stamped with the partner's e-signature. */

export interface Party {
  type: 'individual' | 'entity';
  legalName: string; entityType: string; pan: string; aadhaarLast4: string; gstin: string; udyam: string; cin: string;
  signatory: string; designation: string; authority: string; address: string; state: string; pincode: string;
  email: string; phone: string; agency: string;
  bank?: { holder: string; bank: string; account: string; ifsc: string } | null;
}

export const partyOf = (a: any, bank?: Party['bank']): Party => ({
  type: a.kyc?.type === 'entity' ? 'entity' : 'individual',
  legalName: a.kyc?.legalName || a.name, entityType: a.kyc?.entityType ?? '', pan: a.kyc?.pan ?? '', aadhaarLast4: a.kyc?.aadhaarLast4 ?? '', gstin: a.kyc?.gstin ?? '',
  udyam: a.kyc?.udyam ?? '', cin: a.kyc?.cin ?? '', signatory: a.kyc?.signatory || a.kyc?.legalName || a.name,
  designation: a.kyc?.designation ?? '', authority: a.kyc?.authority ?? '',
  address: a.kyc?.address ?? '', state: a.kyc?.state ?? '', pincode: a.kyc?.pincode ?? '',
  email: a.email, phone: a.phone ?? '', agency: a.agency ?? '', bank: bank ?? null,
});

const istDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const istTime = (d: Date) => d.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });

/** How each kind of entity is described in the parties clause */
const CONSTITUTION: Record<string, string> = {
  'Private Limited': 'a company incorporated under the Companies Act',
  'Public Limited': 'a public company incorporated under the Companies Act',
  LLP: 'a limited liability partnership incorporated under the Limited Liability Partnership Act, 2008',
  Partnership: 'a partnership firm',
  Proprietorship: 'a sole proprietorship concern',
  'Trust / Society': 'a trust / society',
};

/** Completion event on which commission accrues, per service (Schedule B) */
const PAYOUT_TRIGGER: Record<string, string> = {
  'canada-gic': 'The GIC account is funded at or above the prescribed minimum (CAD 23,448 or the then-current amount) and the investment declaration is issued.',
  'german-blocked-account': 'The blocked amount (EUR 11,904 or the then-current amount) is credited to the student\'s blocked account and the confirmation letter is issued.',
  'education-loans': 'The sanctioned loan is disbursed (in full or the relevant tranche) to the institution or student.',
  insurance: 'The policy premium is paid and the policy is issued.',
  'sim-cards': 'The delivered SIM is activated on the carrier network.',
  'fee-payments': 'The transfer is completed and funds are credited to the university or institution with receipt confirmation.',
  'forex-card': 'The card completes its first successful load.',
  'oshc-ovhc': 'The health-cover policy is issued by the approved fund and the certificate is generated.',
  accommodation: 'The booking is confirmed with the accommodation provider (contract signed and deposit paid).',
};

/** Where the partner's signature goes on the execution page (pdf points, bottom-left origin) */
export interface SigBox { page: number; x: number; y: number; w: number; h: number; ref: string }

export async function buildAgreement(p: Party, meta: { number: string; version: string; date: Date }) {
  const s = getSettings();
  const c = s.company;
  const city = c.city || 'Vadodara';
  const w = await Writer.create(`UniVerse Channel Partner Agreement ${meta.number} (v${meta.version})`);
  const cl = w.clause.bind(w);
  const services = SERVICES.filter((x) => !isServiceHidden(x.key));
  const regLabel = /LLP/i.test(c.legalName) ? 'LLPIN' : 'CIN';
  const ref = `UNIV-ESG-${meta.date.getFullYear()}-${crypto.randomInt(100000, 999999)}`;

  w.text('CHANNEL PARTNER AGREEMENT', { size: 17, bold: true, color: NAVY, align: 'center', gap: 2 });
  w.text(`Agreement No. ${meta.number}  |  Version ${meta.version}  |  Issued ${istDate(meta.date)}`, { size: 9, color: SOFT, align: 'center', gap: 10 });

  w.text(`THIS CHANNEL PARTNER AGREEMENT (the "Agreement") is executed electronically at ${city}, ${c.state || 'Gujarat'}, India, and takes effect on the date on which it is signed by the Partner, as recorded in the Execution block (the "Effective Date"),`, { size: 9.6 });
  w.text('BY AND BETWEEN:', { size: 9.6, bold: true, color: NAVY });
  w.text(`${c.legalName}, ${c.constitution || 'a business entity'}${c.cin ? `, bearing ${regLabel} ${c.cin}` : ''}${c.pan ? ` and PAN ${c.pan}` : ''}${c.gstin ? `, GSTIN ${c.gstin}` : ''}, having its registered office at ${c.address} (hereinafter referred to as "UniVerse" or the "First Party", which expression shall, unless repugnant to the context, include its partners, successors and permitted assigns), represented by its ${c.designation || 'Authorised Signatory'}, ${c.signatory}${c.signatoryId ? ` (${/LLP/i.test(c.legalName) ? 'DPIN' : 'DIN'}: ${c.signatoryId})` : ''}, of the ONE PART;`, { size: 9.6, indent: 10 });
  w.text('AND:', { size: 9.6, bold: true, color: NAVY });
  const addr = `${p.address}, ${p.state} - ${p.pincode}, India`;
  const second = p.type === 'individual'
    ? `${p.legalName}, an individual of Indian nationality holding PAN ${p.pan}${p.aadhaarLast4 ? ` and Aadhaar XXXX XXXX ${p.aadhaarLast4}` : ''}, residing at ${addr}${p.agency && p.agency !== p.legalName ? `, carrying on business as "${p.agency}"` : ''}`
    : `${p.legalName}, ${CONSTITUTION[p.entityType] ?? 'an entity'}${p.cin ? `, bearing ${/-/.test(p.cin) ? 'LLPIN' : 'CIN'} ${p.cin}` : ''}, PAN ${p.pan}${p.gstin ? ` and GSTIN ${p.gstin}` : ''}${p.udyam ? `, Udyam registration ${p.udyam}` : ''}, having its principal place of business at ${addr}`;
  const rep = p.type === 'entity'
    ? `, duly represented by its authorised signatory, ${p.signatory}${p.designation ? `, ${p.designation}` : ''}${p.authority ? `, authorised vide ${p.authority}` : ''}`
    : '';
  w.text(`${second} (hereinafter referred to as the "Partner" or the "Second Party", which expression shall, unless repugnant to the context, include its ${p.type === 'individual' ? 'legal heirs and' : 'successors and'} permitted assigns)${rep}, of the OTHER PART.`, { size: 9.6, indent: 10 });
  w.text('UniVerse and the Partner are hereinafter individually referred to as a "Party" and collectively as the "Parties".', { size: 9.6, gap: 6 });

  w.heading('RECITALS');
  cl('A.', `UniVerse owns and operates a business-to-business technology platform and marketplace (the "Platform") through which value-added services for outbound students, including ${services.map((x) => x.name.toLowerCase().replace('canada gic', 'Canada GIC').replace('german', 'German').replace('oshc / ovhc', 'OSHC/OVHC').replace('sim', 'SIM')).join(', ')}, are facilitated through third-party banks, NBFCs, insurers, payment institutions and other delivery partners (the "Service Providers").`);
  cl('B.', 'The Partner is engaged in overseas education consulting and allied activities and has access to students who require such services.');
  cl('C.', 'The Partner wishes to refer such students to the Platform, and UniVerse wishes to accept such referrals and pay the Partner commissions on completed services, on the terms of this Agreement.');
  w.text('NOW, THEREFORE, in consideration of the mutual covenants contained herein, the Parties agree as follows:', { size: 9.6, gap: 4 });

  w.heading('1. DEFINITIONS AND INTERPRETATION');
  cl('1.1', 'In this Agreement, unless the context otherwise requires:');
  w.table(['Term', 'Meaning'], [
    ['"Business Day"', `A day (other than a Saturday, Sunday or public holiday) on which banks are open for general business in ${city}, ${c.state || 'Gujarat'}.`],
    ['"Commission"', 'The amounts payable to the Partner under Clause 8 in accordance with the Commission Structure published on the Platform.'],
    ['"Commission Structure"', 'The schedule of per-service commissions published and maintained by UniVerse on the Platform, together with its recorded revision history, as described in Clause 8.1.'],
    ['"Confidential Information"', 'All non-public information disclosed by either Party, including Student Data, pricing, commission structures, processes, credentials and business information, whether disclosed before or after the Effective Date.'],
    ['"Ownership Record"', 'The Platform\'s time-stamped record of the partner who first registered a Student, used under Clause 12.'],
    ['"Payout Trigger"', 'The defined completion event for a Service, as set out in Schedule B, upon which the corresponding Commission accrues.'],
    ['"Service Request"', 'A request for a specific Service for a specific Student, raised by the Partner on the Platform and allotted a unique reference number.'],
    ['"Services"', 'The value-added student services listed on the Platform, as updated from time to time.'],
    ['"Student"', 'An individual referred by the Partner to the Platform for one or more Services.'],
    ['"Student Data"', 'All personal data and documents of or relating to a Student (including identity, financial, academic and travel information) submitted to or generated through the Platform.'],
    ['"Wallet"', 'The ledger maintained on the Platform recording Commissions accrued, credited, adjusted and withdrawn by the Partner.'],
  ], [0.26, 0.74], { size: 8.6 });
  cl('1.2', 'Headings are for convenience only and do not affect interpretation. References to statutes include amendments and re-enactments. Words importing the singular include the plural and vice versa. The Schedules form an integral part of this Agreement.');

  w.heading('2. APPOINTMENT AND SCOPE');
  cl('2.1', 'UniVerse appoints the Partner, on a non-exclusive basis, to refer Students to the Platform for Services during the Term, and the Partner accepts such appointment.');
  cl('2.2', 'The Partner is an independent contractor. Nothing in this Agreement creates any agency, partnership, joint venture, franchise, or employer-employee relationship between the Parties. The Partner has no authority to bind UniVerse or any Service Provider, to make representations on their behalf, or to collect any payment on their behalf.');
  cl('2.3', 'The Partner shall not appoint sub-agents or sub-partners for referrals under this Agreement without the prior written consent of UniVerse. Team members added by the Partner through the Platform\'s user-management facility act for and on behalf of the Partner, and the Partner remains fully responsible for their acts and omissions.');
  cl('2.4', 'Services are fulfilled by Service Providers. UniVerse is an independent third party that coordinates and tracks fulfilment; the underlying financial, insurance or accommodation products are issued by the respective Service Providers on their own terms, which the Partner shall communicate accurately to Students. For example, a Canada GIC is opened, held and paid out by the partner Canadian bank; an education loan is sanctioned and disbursed by the lender; a policy is issued by the insurer.');
  cl('2.5', 'UniVerse is not a bank, NBFC, insurer or authorised dealer in foreign exchange and does not hold Students\' funds. Eligibility, approval, pricing and timelines are decided by the Service Provider. Where a Service is regulated (such as insurance or lending), the Partner only introduces the Student and shall not solicit, advise on or collect payment for such products unless it holds the licence the law requires.');

  w.heading('3. PLATFORM ACCESS AND ACCEPTABLE USE');
  cl('3.1', 'UniVerse grants the Partner a limited, non-exclusive, non-transferable, revocable right to access and use the Platform during the Term solely for the purposes of this Agreement.');
  cl('3.2', 'The Partner shall keep its credentials confidential, promptly notify UniVerse of any unauthorised use, and shall not (and shall not permit any person to) reverse engineer, scrape, interfere with, or misuse the Platform, or access data of any other partner of UniVerse.');
  cl('3.3', 'UniVerse may suspend access on reasonable prior notice (or immediately, where required for security, fraud prevention or legal compliance) and shall restore access promptly once the cause is resolved.');

  w.heading('4. OBLIGATIONS OF THE PARTNER');
  cl('4.1', 'The Partner shall: (a) submit true, accurate and complete information and documents for each Service Request, and shall never submit forged, altered or misleading documents; (b) obtain each Student\'s free, informed, specific and documented consent before submitting Student Data to the Platform, including consent to processing by UniVerse and the relevant Service Providers for fulfilment of the Services; (c) verify, to the standard of a reasonable prudent business, the identity of each Student and the genuineness of identity documents; (d) not make any representation, commitment or discount offer regarding Services, rates, timelines, visa outcomes or refunds other than as published on the Platform; (e) not charge Students any additional amount in the name of UniVerse or any Service Provider; (f) comply with all applicable laws, including the Consumer Protection Act, 2019, advertising and unfair-trade-practice norms, and rules of any regulator applicable to its own business; and (g) promptly notify UniVerse of any complaint, dispute, regulatory enquiry or legal process concerning a Service Request.');
  cl('4.2', 'The Partner shall not solicit or accept from Students any cash consideration for Services payable through the Platform, nor divert Students to competing platforms in a manner inconsistent with Clause 16.');
  cl('4.3', p.type === 'entity'
    ? 'The Partner confirms its valid incorporation or constitution and subsistence, and the due authority of its signatory, and that the particulars stated in Schedule A are true, current and complete.'
    : 'The Partner confirms that it has the legal capacity to enter into this Agreement and that the particulars stated in Schedule A are true, current and complete.');

  w.heading('5. OBLIGATIONS OF UNIVERSE');
  cl('5.1', 'UniVerse shall: (a) provide the Partner access to the Platform with commercially reasonable availability; (b) assign a relationship manager for onboarding and support; (c) process Service Requests diligently and provide status visibility through the Platform; (d) credit Commissions to the Wallet upon the applicable Payout Trigger and settle withdrawals within the timelines in Clause 8; and (e) protect the Partner\'s and Students\' data in accordance with Clause 6 and applicable law.');
  cl('5.2', 'Turnaround times: UniVerse shall acknowledge each new Service Request within one (1) Business Day and review documents uploaded to it within two (2) Business Days. Indicative fulfilment times for each Service are shown in Schedule B and on the Platform.');

  w.heading('6. STUDENT DATA, PRIVACY AND DATA PROTECTION');
  cl('6.1', 'Ring-fencing. Student Data submitted by the Partner shall be accessible only to the Partner, to UniVerse personnel and Service Providers engaged in fulfilling that Partner\'s Service Requests, and shall never be shared with, disclosed to, or made usable by any other partner or competing consultant on the Platform. UniVerse shall not solicit the Partner\'s Students for services outside the scope of the referred Service Requests.');
  cl('6.2', 'As between the Parties, for Student Data the Partner acts as the party determining the initial purpose of collection (having obtained the Student\'s consent), and UniVerse processes such data for fulfilment purposes as a data processor or independent data fiduciary, as applicable, in compliance with the Digital Personal Data Protection Act, 2023 and the rules thereunder, and the Information Technology Act, 2000, as applicable.');
  cl('6.3', 'Each Party shall: (a) implement reasonable security practices and procedures commensurate with the sensitivity of the data handled; (b) notify the other Party without undue delay (and in any event within 72 hours) of any personal data breach affecting data shared under this Agreement, and cooperate in remediation and statutory reporting; and (c) not retain Student Data longer than necessary for fulfilment, regulatory or evidentiary purposes.');
  cl('6.4', 'The Partner shall not use Student Data obtained through the Platform for any purpose other than the concerned Service Request except with the Student\'s separate consent. On termination, each Party shall return or securely destroy the other Party\'s Confidential Information (including Student Data) within 90 days, save for retention required by law or for settlement of accrued rights.');
  cl('6.5', 'Identity documents of the Partner or its signatories collected for verification shall be stored by UniVerse securely (and in masked form wherever required under the Aadhaar Act, 2016) and used solely for identity verification, tax compliance and execution of this Agreement.');
  cl('6.6', `Grievance contact for data protection matters: Compliance Officer, ${c.legalName}, ${c.email || s.supportEmail}, ${s.supportPhone}.`);

  w.heading('7. SERVICE REQUESTS, FULFILMENT AND STATUSES');
  cl('7.1', 'Each referral shall be raised as a Service Request on the Platform with the documents prescribed for the relevant Service. UniVerse may reject or return defective Service Requests with reasons recorded.');
  cl('7.2', 'Timelines indicated on the Platform are bona fide estimates dependent on Service Providers and third parties and are not guaranteed; UniVerse shall not be liable for delays attributable to Service Providers, Students or authorities, but shall keep the Partner reasonably informed.');
  cl('7.3', 'Communication relating to a Service Request (desk messages, document requests, approvals) recorded on the Platform shall constitute written communication between the Parties for the purposes of that Service Request.');

  w.heading('8. COMMISSION, WALLET AND PAYOUTS');
  cl('8.1', 'Commission Structure on the Platform. The Commission payable for each Service shall be as per the Commission Structure published by UniVerse on the Platform (accessible at all times in the "Commissions" section of the partner dashboard and app), as in force on the date the relevant Payout Trigger occurs. UniVerse shall maintain on the Platform the current Commission Structure together with a complete record of every revision, including its effective period, and such structure and revision history shall be deemed incorporated into this Agreement by reference. Commission rates are dynamic: the Commission Structure may be revised prospectively by UniVerse with not less than 30 days\' prior notice published on the Platform and sent to the Partner\'s registered email address, mobile number and in-app notifications in accordance with Clause 23; a revised structure shall not apply to Service Requests whose Payout Trigger has already occurred.');
  cl('8.2', 'A Commission accrues only upon the Payout Trigger defined in Schedule B for that Service and is credited to the Wallet at its full value within seven (7) Business Days of the Service Provider\'s confirmation. Tax is deducted at source under Clause 9 when the Commission is withdrawn. No Commission accrues for cancelled, refunded, fraudulent or reversed transactions, or for refused cases unless the relevant Service Provider pays a refusal-case fee, in which case UniVerse shall pass through the agreed share.');
  cl('8.3', 'Clawback. If a Service is cancelled, refunded, unwound, charged back or found to be fraudulent after credit, UniVerse may debit the Wallet or set off the corresponding Commission against future payouts, with an entry visible to the Partner.');
  cl('8.4', `The Wallet is a ledger of accrued earnings; it is not a deposit and does not bear interest. The Partner withdraws by selecting cleared Commission entries; each entry is withdrawn in full. Withdrawals shall be processed to the Partner's verified bank account or UPI ID (Schedule A, or as updated on the Platform) within two (2) Business Days of a valid withdrawal request being approved, subject to a minimum withdrawal of ${money(s.minWithdrawal)}.`);
  cl('8.5', 'Commissions denominated in foreign currency (e.g., CAD, EUR) shall be converted to INR at the rate applied by the relevant Service Provider at the time of its payout to UniVerse, and the converted amount shall be credited to the Wallet.');
  cl('8.6', 'On termination of this Agreement, Commissions accrued up to the effective termination date shall be honoured and settled within fifteen (15) Business Days of the later of termination and occurrence of the Payout Trigger, subject to Clauses 8.2 and 8.3.');
  cl('8.7', 'Claims. If the Partner believes a Commission has not been credited or is incorrect, it shall raise a claim on the Platform (through the Service Request chat or its relationship manager) within sixty (60) days of the Payout Trigger, with any supporting evidence. UniVerse shall respond with its findings within seven (7) Business Days.');

  w.heading('9. TAXES');
  cl('9.1', `UniVerse shall deduct tax at source on Commissions under section 393 of the Income-tax Act, 2025 (corresponding to section 194H of the Income-tax Act, 1961) at the rate in force, currently ${s.tdsRate}%. Commissions are held in the Wallet at full value and tax is deducted on the Commission entries the Partner selects for withdrawal, at the time of withdrawal, and deposited against the Partner's PAN; UniVerse may instead deduct it at an earlier time where the law requires. TDS certificates are issued every quarter. Where the Partner fails to furnish a valid PAN, tax shall be deducted at the higher rate prescribed by law.`);
  cl('9.2', `Commissions are exclusive of GST. Where the Partner is registered (or liable to be registered) under GST, the Partner shall furnish its GSTIN, withdraw "with GST" and issue a valid tax invoice to UniVerse on the Platform for the Commission withdrawn, and GST as applicable (currently ${s.gstRate}%) shall be payable by UniVerse in addition, after verification of the invoice. The Partner shall report each such invoice in its GST returns; UniVerse may recover GST paid on an invoice whose input tax credit is denied because of the Partner's default. The Parties shall cooperate on e-invoicing and reconciliation. Each Party bears its own taxes.`);
  cl('9.3', 'A Partner not registered under GST withdraws "without GST" and confirms that it is not required to be registered. The Partner shall keep its PAN, GST and bank details in Schedule A current, and payouts may be withheld pending updated KYC where required by law or banking norms.');

  w.heading('10. REPORTING AND RECONCILIATION');
  cl('10.1', 'The Platform shows every Service Request, its status and documents, and every Wallet entry with its TDS and GST details, in real time; the Partner may download its statement at any time. On written request, UniVerse shall provide a reconciliation statement for any period within ten (10) Business Days. Each Party shall keep its records relating to this Agreement for at least eight (8) years.');

  w.heading('11. DISCREPANCIES');
  cl('11.1', 'Any discrepancy in a statement, Commission, deduction or payout shall be reported by the Partner in writing on the Platform within thirty (30) days of the entry appearing. UniVerse shall investigate and reply with its findings within ten (10) Business Days and shall make any correction to the Wallet within five (5) Business Days thereafter. A discrepancy not resolved to the Partner\'s satisfaction shall be escalated to UniVerse\'s Head of Partnerships, who shall decide within a further ten (10) Business Days, after which Clause 21 applies.');

  w.heading('12. STUDENT OWNERSHIP AND CONFLICT RESOLUTION');
  cl('12.1', 'A Student belongs to the partner who first registered that Student on the Platform with the Student\'s consent, as shown by the Ownership Record. Commission for that Student\'s Service Requests is payable to that partner.');
  cl('12.2', 'Where another partner submits the same Student, or the Partner believes that one of its Students has been claimed by another partner, the Partner shall raise an ownership dispute on the Platform or by email to its relationship manager within fifteen (15) days of becoming aware of it. UniVerse shall hold the Commission for the affected Service Requests until the dispute is resolved.');
  cl('12.3', 'UniVerse shall convene a dedicated resolution discussion with the partners concerned within seven (7) Business Days, review the Ownership Record, the documents submitted and the Student\'s written preference, and communicate a written decision within fifteen (15) Business Days of the dispute being raised. The held Commission shall be released in accordance with that decision. A partner who does not accept the decision may proceed under Clause 21.');

  w.heading('13. REPRESENTATIONS AND WARRANTIES');
  cl('13.1', 'Each Party represents and warrants that: (a) it has full power and authority to enter into and perform this Agreement, which constitutes its legal, valid and binding obligation; (b) execution and performance do not violate any law, order or agreement binding on it; and (c) it shall comply with all applicable laws in performing this Agreement.');
  cl('13.2', 'The Partner additionally represents and warrants that: (a) all information provided at onboarding (including Schedule A particulars) is true and shall be kept updated; (b) it shall not engage in mis-selling, forgery, money laundering, or any fraudulent or unlawful act in connection with the Platform; and (c) it shall maintain in force all registrations and licences required for its business, including those applicable to overseas education consulting.');

  w.heading('14. COMPLIANCE');
  cl('14.1', 'The Parties shall comply with the Prevention of Corruption Act, 1988, the Prevention of Money Laundering Act, 2002, applicable economic sanctions, and all anti-bribery and anti-money-laundering laws. The Partner shall not offer or accept any bribe, kickback, or improper inducement in connection with this Agreement, and shall promptly report suspicious transactions concerning Service Requests.');
  cl('14.2', 'UniVerse may suspend or terminate Service Requests and withhold associated Commissions where required for statutory, banking or Service Provider compliance (including KYC/AML holds), with reasons recorded on the Platform.');

  w.heading('15. INTELLECTUAL PROPERTY');
  cl('15.1', 'UniVerse (or its licensors) owns all rights in the Platform, its content, marks and materials. Except for the limited right of use under Clause 3.1, no licence or right is granted to the Partner.');
  cl('15.2', 'The Partner shall not use the name, logo or marks of UniVerse or any Service Provider in any publicity or material without prior written consent, except factual references necessary for performing this Agreement.');
  cl('15.3', 'The Partner grants UniVerse a non-exclusive, royalty-free licence to host, process and transmit content submitted by the Partner (including Student Data) solely to perform under this Agreement.');

  w.heading('16. NON-CIRCUMVENTION AND NON-SOLICITATION');
  cl('16.1', 'During the Term and for twelve (12) months thereafter, the Partner shall not, directly or indirectly: (a) circumvent UniVerse by dealing directly with a Service Provider introduced through the Platform in respect of a Student referred under this Agreement with the intention of depriving UniVerse of its fee; or (b) solicit UniVerse\'s employees or Service Providers to terminate or divert their engagement in connection with business of the kind contemplated by this Agreement.');
  cl('16.2', 'During the Term, UniVerse shall not knowingly solicit Students referred by the Partner for engagement with competing education or immigration consultancies.');

  w.heading('17. CONFIDENTIALITY');
  cl('17.1', 'Each Party shall keep the other\'s Confidential Information strictly confidential, use it solely for this Agreement, protect it with at least the care it applies to its own confidential information (and no less than reasonable care), and not disclose it except to personnel and Service Providers bound by equivalent obligations on a need-to-know basis.');
  cl('17.2', 'Obligations under this Clause do not apply to information that is public without breach, independently developed, lawfully obtained from a third party, or required to be disclosed by law or regulator (with prior notice where lawful).');
  cl('17.3', 'This Clause survives termination for a period of five (5) years; obligations concerning Student Data survive for so long as such data is retained.');

  w.heading('18. INDEMNIFICATION');
  cl('18.1', 'The Partner shall indemnify, defend and hold harmless UniVerse, its partners, officers and Service Providers from and against all claims, losses, damages, penalties, fines, costs and expenses (including reasonable legal fees) arising out of: (a) false, forged or misleading documents or information submitted by or through the Partner; (b) breach of Clauses 4 (obligations), 6 (data protection), 14 (compliance) or 16 (non-circumvention) by the Partner; (c) misrepresentation to, or disputes with, Students caused by the Partner; and (d) unlawful acts, gross negligence or wilful misconduct of the Partner or its personnel.');
  cl('18.2', 'UniVerse shall indemnify and hold harmless the Partner from third-party claims to the extent arising from UniVerse\'s infringement of intellectual property rights through the Platform, or UniVerse\'s breach of Clause 6.1 (ring-fencing).');
  cl('18.3', 'The indemnified Party shall give prompt notice, reasonable cooperation, and conduct of defence to the indemnifying Party (subject to the indemnified Party\'s right to participate with its own counsel at its own cost).');

  w.heading('19. LIMITATION OF LIABILITY');
  cl('19.1', 'Neither Party shall be liable for indirect, incidental, special, consequential or punitive damages, or for loss of profits, revenue, data or goodwill, however arising.');
  cl('19.2', 'UniVerse\'s aggregate liability under this Agreement shall not exceed the total Commissions paid or payable to the Partner in the six (6) months preceding the event giving rise to the claim.');
  cl('19.3', 'Nothing in this Clause excludes liability arising from fraud, wilful misconduct, gross negligence, breach of Clause 6 (data protection) or Clause 17 (confidentiality), or indemnification obligations under Clause 18.');

  w.heading('20. TERM, SUSPENSION AND TERMINATION');
  cl('20.1', 'This Agreement commences on the Effective Date and, unless terminated earlier, remains valid for twenty-four (24) months (the "Initial Term"), thereafter auto-renewing for successive twelve (12) month terms (together, the "Term"), unless either Party gives 30 days\' prior written notice of non-renewal.');
  cl('20.2', 'Either Party may terminate this Agreement for convenience by giving thirty (30) days\' prior written notice to the other, including through the Platform.');
  cl('20.3', 'Either Party may terminate with immediate effect by written notice if the other: (a) commits a material breach not cured within 15 days of notice; (b) becomes insolvent, bankrupt, or ceases business; or (c) commits fraud, forgery, bribery or wilful misconduct. UniVerse may in addition terminate immediately for Partner breaches of Clauses 6.1 or 14, or repeated submission of defective or fraudulent documents.');
  cl('20.4', 'On termination: (a) Platform access ceases; (b) open Service Requests may, at UniVerse\'s reasonable discretion and subject to Service Provider terms, be completed or cancelled, in consultation with the Partner; (c) accrued Commissions shall be settled per Clause 8.6; (d) each Party shall comply with Clauses 6.4 and 17 regarding data and confidentiality; and (e) accrued rights and remedies are unaffected.');
  cl('20.5', 'Clauses 1, 6, 8.6, 8.7, 9, 10, 11, 12, 16, 17, 18, 19, 21, 23 and 24 survive termination.');

  w.heading('21. DISPUTE RESOLUTION, GOVERNING LAW AND JURISDICTION');
  cl('21.1', 'The Parties shall first attempt in good faith to resolve any dispute arising out of or in connection with this Agreement (after the processes in Clauses 11 and 12, where they apply) through senior-level discussions within fifteen (15) days of written notice of the dispute.');
  cl('21.2', `Failing such resolution, the dispute shall be finally resolved by arbitration by a sole arbitrator mutually appointed by the Parties, in accordance with the Arbitration and Conciliation Act, 1996 (as amended). The seat and venue of arbitration shall be ${city}, ${c.state || 'Gujarat'}, India, the proceedings shall be in English, and the award shall be final and binding. Costs shall be borne as awarded.`);
  cl('21.3', 'Nothing prevents a Party from seeking interim or injunctive relief (including under Section 9 of the said Act) from a competent court.');
  cl('21.4', `This Agreement shall be governed by and construed in accordance with the laws of India. Subject to Clause 21.2, the courts at ${city}, ${c.state || 'Gujarat'} shall have exclusive jurisdiction.`);

  w.heading('22. FORCE MAJEURE');
  cl('22.1', 'Neither Party shall be liable for failure or delay in performance (other than payment of amounts already accrued) caused by events beyond its reasonable control, including acts of God, epidemics, war, riots, strikes, governmental actions, regulatory changes affecting a Service, bank or payment-system outages, or failures of Service Providers not attributable to the affected Party. The affected Party shall notify promptly and resume performance as soon as reasonably possible. If the event persists beyond ninety (90) days, either Party may terminate without liability, with accrued rights honoured.');

  w.heading('23. NOTICES');
  cl('23.1', 'Notices shall be in writing and delivered by hand, registered post, reputed courier, or email (with delivery confirmation), to the addresses stated in the Execution block and Schedule A, or as updated by notice. Email notices are effective on the date of successful transmission; postal notices on delivery. Platform in-app notifications and messages to the registered mobile number shall additionally constitute valid notice of operational matters (including Commission Structure revisions, statuses and holds).');

  w.heading('24. GENERAL');
  cl('24.1', 'Entire Agreement. This Agreement (with its Schedules, and the Commission Structure incorporated by reference under Clause 8.1) constitutes the entire agreement between the Parties on its subject matter and supersedes all prior discussions.');
  cl('24.2', 'Amendment. Only by a written instrument signed (including electronically) by both Parties, save prospective Commission Structure updates per Clause 8.1.');
  cl('24.3', 'Assignment. The Partner shall not assign this Agreement without UniVerse\'s prior written consent. UniVerse may assign to an affiliate or in connection with a merger, reorganisation or sale of business, with notice.');
  cl('24.4', 'Severability. Invalid provisions shall be severed and the remainder enforced.');
  cl('24.5', 'Waiver. No waiver is effective unless written; no failure to enforce is a waiver of future enforcement. Remedies are cumulative.');
  cl('24.6', 'No third-party beneficiaries. Nothing herein benefits any Student or third party as against either Party.');
  cl('24.7', 'Counterparts and electronic execution. This Agreement may be executed in counterparts and by electronic means, including acceptance on the Platform through a link sent to the Partner\'s registered email address or a signed-in session together with a typed name and hand-drawn signature, Aadhaar-based eSign, or digital signature certificates, each of which shall be valid, binding and admissible as an electronic record under the Information Technology Act, 2000 and the Bharatiya Sakshya Adhiniyam, 2023. Execution logs (signature reference, timestamps, IP addresses and the document\'s SHA-256 fingerprint) shall be retained as part of the executed record.');
  cl('24.8', `Stamp duty. This Agreement shall be duly stamped (including by e-stamp) in accordance with the Indian Stamp Act and the stamp laws of the State of ${c.state || 'Gujarat'}; the cost shall be borne by UniVerse.`);

  // Schedule A
  w.newPage();
  w.text('SCHEDULE A: SECOND PARTY DETAILS', { size: 12.5, bold: true, color: NAVY, gap: 6 });
  const rowsA: string[][] = p.type === 'entity'
    ? [
      ['Legal name of entity', p.legalName], ['Constitution', p.entityType], ['CIN / LLPIN', p.cin || 'Not applicable'], ['PAN', p.pan],
      ['GSTIN', p.gstin || 'Not registered'], ['Udyam (MSME) registration', p.udyam || 'Not provided'], ['Registered address', addr],
      ['Authorised signatory', `${p.signatory}${p.designation ? `, ${p.designation}` : ''}`], ['Authority evidence', p.authority || 'Declared on the Platform'],
      ['Trade name on the Platform', p.agency || p.legalName], ['Email', p.email], ['Mobile', p.phone],
    ]
    : [
      ['Name (as per PAN)', p.legalName], ['PAN', p.pan], ['Aadhaar (masked)', p.aadhaarLast4 ? `XXXX XXXX ${p.aadhaarLast4}` : 'Not provided'], ['Address', addr], ['Trade name on the Platform', p.agency || p.legalName],
      ['Email', p.email], ['Mobile', p.phone],
    ];
  w.table(['Field', 'Particulars'], rowsA, [0.34, 0.66]);
  w.text('A.1 Payout bank account', { size: 10.5, bold: true, color: NAVY, gap: 4 });
  w.table(['Field', 'Particulars'], p.bank
    ? [['Beneficiary name (as per bank)', p.bank.holder], ['Bank name & branch', p.bank.bank], ['Account number', p.bank.account], ['IFSC', p.bank.ifsc], ['Verification', 'IFSC verified on the Platform']]
    : [['Payout account', 'To be added by the Partner on the Platform (Wallet → payout methods) before the first withdrawal. Withdrawals are paid only to accounts in the Partner\'s own name or that of its GST-registered entity.']],
  [0.34, 0.66]);

  // Schedule B
  w.space(6);
  w.text('SCHEDULE B: PAYOUT TRIGGERS AND COMMISSION STRUCTURE', { size: 12.5, bold: true, color: NAVY, gap: 2 });
  w.text(`Commission Structure in force from ${s.commissionEffective}, before TDS and exclusive of GST. It is revised under Clause 8.1; the current version is always on the Platform.`, { size: 8.8, color: SOFT, gap: 6 });
  w.table(['Service', 'Payout Trigger (Commission accrues when...)', 'Indicative TAT', 'Commission'],
    services.map((x) => [x.name, PAYOUT_TRIGGER[x.key] ?? 'The Service is completed and confirmed by the Service Provider.', x.tat, `${x.commission.amount} ${x.commission.note}`]),
    [0.18, 0.46, 0.13, 0.23], { size: 8.4 });
  w.text('Events not constituting a Payout Trigger (indicative): visa refusal (unless a Service Provider refusal-case fee applies and is actually received), account closure without funding, cancelled policies or bookings, chargebacks, or transactions reversed for any reason.', { size: 8.8 });

  // Execution
  w.ensure(250);
  w.space(10);
  w.text('EXECUTION', { size: 12.5, bold: true, color: NAVY, gap: 2 });
  w.text('IN WITNESS WHEREOF, the Parties have executed this Agreement electronically as of the Effective Date.', { size: 9.2, gap: 10 });
  const top = w.y;
  const colW = (w.width - 20) / 2;
  const page = w.page;
  const L = w.left;
  const lines = (x: number, y: number, rows: [string, boolean][]) => rows.forEach(([t, b], i) =>
    page.drawText(plain(t).slice(0, 64), { x, y: y - i * 12, size: 8.4, font: b ? w.bold : w.font, color: b ? NAVY : INK }));
  lines(L, top - 8, [[`FOR ${c.legalName.toUpperCase()} (First Party)`, true]]);
  page.drawText('Issued electronically by UniVerse', { x: L, y: top - 52, size: 8.6, font: w.font, color: SOFT });
  page.drawLine({ start: { x: L, y: top - 66 }, end: { x: L + colW, y: top - 66 }, thickness: 0.6, color: NAVY });
  lines(L, top - 80, [
    [`Name: ${c.signatory}`, false], [`Designation: ${c.designation || 'Authorised Signatory'}`, false], [`For and on behalf of ${c.legalName}`, false],
    [`Email: ${c.email || s.supportEmail}`, false], [`Place: ${city}, ${c.state || 'Gujarat'}`, false], [`Issued on: ${istDate(meta.date)}`, false],
  ]);
  const px = L + colW + 20;
  lines(px, top - 8, [[`FOR ${p.legalName.toUpperCase()} (Second Party)`, true]]);
  page.drawLine({ start: { x: px, y: top - 66 }, end: { x: px + colW, y: top - 66 }, thickness: 0.6, color: NAVY });
  lines(px, top - 80, [
    [`Name: ${p.signatory}`, false], [`Designation: ${p.type === 'entity' ? p.designation || 'Authorised Signatory' : 'Proprietor / Partner in person'}`, false],
    [`Email: ${p.email}`, false], [`eSign reference: ${ref}`, false],
  ]);
  const sigBox: SigBox = { page: w.doc.getPageCount() - 1, x: px, y: top - 64, w: colW, h: 48, ref };

  const pdf = await w.save();
  return { pdf, hash: crypto.createHash('sha256').update(pdf).digest('hex'), sigBox };
}

/** Stamps the partner's signature into the execution block and adds a signature certificate page */
export async function signAgreement(pdf: Buffer, sigBox: SigBox, sig: { path: string; name: string; at: Date; ip: string; ua: string; hash: string; number: string }) {
  const doc = await PDFDocument.load(pdf);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.getPage(sigBox.page);
  drawSignature(page, sig.path, sigBox.x, sigBox.y, Math.min(sigBox.w, 150), sigBox.h);
  const extra = [`Digitally signed: ${sig.name}`, `Date & time (IST): ${istTime(sig.at)}`, `Execution IP (audit trail): ${sig.ip || 'not available'}`];
  extra.forEach((t, i) => page.drawText(plain(t).slice(0, 64), { x: sigBox.x, y: sigBox.y - 80 - i * 12, size: 8.4, font: i ? font : bold, color: i ? INK : NAVY }));

  const cert = doc.addPage([595.28, 841.89]);
  let y = 780;
  const t = (s: string, size = 10, b = false, color = INK) => { cert.drawText(plain(s), { x: 56, y, size, font: b ? bold : font, color }); y -= size * 1.8; };
  t('Electronic signature certificate', 15, true, NAVY);
  t(`Agreement ${sig.number} · eSign reference ${sigBox.ref}`, 10, false, SOFT);
  y -= 8;
  t(`Signed by: ${sig.name}`, 10.5, true);
  t(`Date and time: ${istTime(sig.at)} IST`);
  t(`IP address: ${sig.ip || 'not available'}`);
  t(`Device: ${sig.ua.slice(0, 90) || 'not available'}`);
  t('Method: typed name and hand-drawn signature on the UniVerse Platform, after opening the agreement from the');
  t('link sent to the registered email address (or a signed-in session) and confirming acceptance of its terms.');
  y -= 6;
  t('SHA-256 of the document as issued for signature:', 10, true);
  t(sig.hash, 8.6);
  drawSignature(cert, sig.path, 56, y - 70, 180, 60);
  return Buffer.from(await doc.save());
}
