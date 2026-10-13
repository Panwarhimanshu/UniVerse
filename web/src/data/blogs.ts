/* Insights / blog catalogue.
   Rendered on each service page and in the dashboard "What's New" feed. */

export interface Blog { id?: string; t: string; d: string; mins: number; teaser: string; body: string[] }

export const BLOGS: Record<string, Blog[]> = {
  'canada-gic': [
    {
      t: 'GIC minimum rises to CAD 23,448: what agents must tell students now',
      d: '2026-09-30', mins: 4,
      teaser: 'IRCC has revised the proof-of-funds floor for the Student Direct Stream. Here is the exact wording to share with applicants and parents.',
      body: [
        'For 2026-27 intakes, the Guaranteed Investment Certificate amount that underpins SDS study-permit applications stands at CAD 23,448, up from CAD 22,895. The figure tracks Canada’s revised cost-of-living benchmark and applies to new GIC purchases: students who funded earlier at the older amount are not required to top up, but fresh applications filed with the old number risk document-based refusals.',
        'Practical advice for partner agents: collect the revised amount evidence before lodgement, keep the Investment Declaration (not just the wire receipt) in the visa file, and remind students that the GIC is returned to them in instalments after landing: it is parked money, not a fee. Our GIC desk re-verifies every certificate against the CAD 23,448 floor before your case moves to filing.',
      ],
    },
    {
      t: 'CIBC vs BMO vs ICICI Bank Canada: which GIC issues fastest in 2026?',
      d: '2026-09-15', mins: 5,
      teaser: 'We timed 120 recent GIC files across the four partner banks. The gap between fastest and slowest is bigger than most agents assume.',
      body: [
        'Median certificate issuance ran 4 working days at CIBC, 5 at ICICI Bank Canada and 6 at BMO, with Beacon Money completing wallet-based alternatives in under 3 days where a traditional GIC is not mandatory. Weekends and Indian wire cut-offs, not bank processing, caused most of the variance, so the real lever is when the student remits, not only where.',
        'Our recommendation remains file-specific: CIBC for speed-critical SDS files, ICICI Bank Canada for students who prefer an Indian ecosystem familiar to parents, and BMO where branch access after landing matters. Whichever bank you choose, identical agent payout applies, so optimising purely for the student’s timeline costs you nothing.',
      ],
    },
    {
      t: 'Visa refused? How the GIC refund process actually works',
      d: '2026-08-29', mins: 4,
      teaser: 'Refunds are real, documented and faster than the rumours suggest, as long as the refusal letter reaches the bank in the right format.',
      body: [
        'Every partner bank refunds a GIC on visa refusal, but each wants a specific pack: refusal letter copy, refund form signed by the student, and a cancelled-cheque equivalent for the return account. CIBC and BMO settle in 8–15 business days once the pack is complete; delays almost always trace back to unsigned forms or name mismatches between passport and account.',
        'Flag refusal cases to your UniVerse dashboard within 48 hours: the desk prepares the bank-specific refund pack, validates it against that bank’s checklist and couriers it the same week. Re-applicants can re-use a fresh GIC at the current CAD 23,448 amount; the refunded file does not count against a new SDS application.',
      ],
    },
  ],
  'german-blocked-account': [
    {
      t: 'Blocked account amount for 2026-27: the €11,904 figure, explained',
      d: '2026-09-27', mins: 4,
      teaser: 'Why the Sperrkonto floor is €11,904, how the monthly €992 payout maths works, and what to tell parents about top-ups.',
      body: [
        'The blocked account requirement equals 12 × €992: the monthly sum German authorities consider sufficient for a student. It is reviewed annually, so always confirm the live figure before a student wires money; an under-funded account stalls the visa file, while excess amounts simply pay out faster after arrival.',
        'Through Expatrio, students can bundle the blocked account with statutory health insurance and a free current account, with the 06-confirmation letter issued digitally. Remind students to keep the transfer receipt and the confirmation letter together: consulates ask for both, and mismatched names between them are a classic appointment-day problem.',
      ],
    },
    {
      t: 'The 06-confirmation letter: the one document German consulates check first',
      d: '2026-09-10', mins: 3,
      teaser: 'Visa officers scan for it before anything else in the finance section. Here is how to make sure yours clears instantly.',
      body: [
        'The 06-Bestaetigung is the formal proof that the blocked amount has been deposited. Digital confirmations from providers like Expatrio are accepted at German missions in India, but the document must show the full €11,904 (or current amount), the student’s name exactly as in the passport, and a verifiable reference number.',
        'Dos and don’ts: print it in colour, carry the transfer receipt alongside, and never crop the PDF. If a correction is needed (a misspelt name is the usual one), providers reissue within 24 hours, so route the request through your dashboard as soon as the admission letter spells the name differently.',
      ],
    },
    {
      t: 'Life after landing: how the €992 monthly Sperrkonto payout really works',
      d: '2026-08-22', mins: 4,
      teaser: 'The money is the student’s own, but it unlocks monthly, not at once. A primer you can forward to every Germany-bound family.',
      body: [
        'Once the student arrives, registers their address (Anmeldung) and activates a German current account, the blocked account releases €992 per month for twelve months. Activation is fully digital with Expatrio: the student verifies identity via video or PostIdent and payouts typically start within the first two weeks.',
        'Common parent question: “What if my child needs more in month one?” The blocked amount is a visa construct, not a spending cap: families can always send additional money separately. Students who finish early or return home can close the account and withdraw the remaining balance with proof of departure or enrolment cancellation.',
      ],
    },
  ],
  'oshc-ovhc': [
    {
      t: 'OSHC length must mirror visa length: the mismatch that delays grants',
      d: '2026-09-21', mins: 3,
      teaser: 'A two-week gap between policy dates and visa dates is enough to trigger a request for further information. Getting it right takes one minute.',
      body: [
        'For the subclass 500 student visa, health cover must span the entire visa duration: start on or before arrival and run to (or past) the visa end date, which is calculated from the CoE course end plus buffer months. Under-covering forces a top-up and can suspend processing until corrected.',
        'Our OSHC flow reads the CoE dates and locks the policy window accordingly: single, couple or family cover from Medibank or nib, certificate issued same day and formatted exactly as ImmiAccount expects. If a student later extends the course, extend OSHC first, then lodge the new visa; the order matters.',
      ],
    },
    {
      t: 'Medibank vs nib in 2026: OSHC plans compared for Indian students',
      d: '2026-09-01', mins: 4,
      teaser: 'Both are government-approved, both are ImmiAccount-ready: the differences sit in price tiers, direct-billing networks and app experience.',
      body: [
        'For a single student on a three-year visa, current pricing separates the two funds by roughly 6–9%, with Medibank’s larger direct-billing GP network offsetting its modest premium for many students. nib counters with a polished app and fast digital claims: a genuine quality-of-life difference when a student is claiming GP visits monthly.',
        'Neither fund’s customer experience should change your suitability logic: check university tie-ups first (some institutions default to one fund for packaged offers), then compare the direct-billing clinic map near the student’s suburb. Both pay agent commission on the same trigger, so recommend on student fit alone.',
      ],
    },
    {
      t: 'Couple and family OSHC: the under-used upgrade your students ask about late',
      d: '2026-08-08', mins: 3,
      teaser: 'Dependants on a student visa need cover too: bundling at purchase is far cheaper than apologising at renewal.',
      body: [
        'Australia requires all accompanying family members on a subclass 500 to hold OVHC/OSHC-grade cover. Buying a combined couple or family policy at lodgement is typically 15–25% cheaper than stacking separate singles later, and it simplifies ImmiAccount uploads to one certificate set.',
        'If a spouse joins mid-course, a new policy must start before they land: request it through your dashboard with the dependant’s passport and the primary student’s visa grant notice. The certificate uploads alongside the dependant’s application, and the same-day issuance standard applies.',
      ],
    },
  ],
  'education-loans': [
    {
      t: 'Unsecured education loans in 2026: what actually changed for 2026 intakes',
      d: '2026-09-28', mins: 5,
      teaser: 'NBFC appetite shifted this quarter: higher unsecured ceilings for top-500 admits, tighter co-applicant norms elsewhere.',
      body: [
        'The headline: unsecured ceilings now reach ₹75 lakh for admits to globally ranked institutions with strong co-applicant income, while mid-tier profiles are being routed to hybrid structures: partial collateral plus an unsecured top-up. Public-sector banks remain the rate leaders for secured files; NBFCs win on speed and document flexibility.',
        'For agents, the conversion lever is sequencing: collect income documents before the counselling call, and let the desk shortlist three lenders in parallel. Files submitted with complete KYC move to sanction in 7–14 days; every missing document historically adds a week, which is why our checklist gates the case before it reaches a lender queue.',
      ],
    },
    {
      t: 'The 21-day playbook: sanction letter in hand before the visa interview',
      d: '2026-09-12', mins: 4,
      teaser: 'Week-by-week sequencing that turns loan sanction from the critical path into a background task.',
      body: [
        'Days 1–3: freeze the lender shortlist and collect KYC plus co-applicant financials. Days 4–10: lender credit assessment. Respond to queries within 24 hours and the file never leaves the fast lane. Days 11–17: sanction communication and student acceptance. Days 18–21: the sanction letter in PDF, embassy-formatted where required, ready for the visa file.',
        'Two traps derail this timeline: property legal valuation for secured loans (start it in week one, in parallel) and co-applicant ITR gaps (a CA-certified computation often substitutes). Our desk runs a daily query queue precisely so that one slow afternoon never costs your student their slot.',
      ],
    },
    {
      t: 'Secured vs unsecured: approval data from 500 recent files',
      d: '2026-08-26', mins: 6,
      teaser: 'What sanction rates say about profile matching, and why “just apply everywhere” wastes four weeks.',
      body: [
        'Across 500 files routed this season, well-matched secured applications cleared at 96% with a median 9-day sanction; unsecured files cleared at 84% where the co-applicant income crossed ₹6 lakh annually and the admit ranked within the lender’s internal tier list. The single biggest rejection cause was not academic profile: it was applying to the wrong lender segment first and burning enquiry marks.',
        'The actionable takeaway is to use lending-match data before committing: admit tier, co-applicant profile and property availability define the segment, and the segment defines the lender. Cases logged through the marketplace carry this matching by default: the first shortlist you receive is already the one with the highest sanction probability.',
      ],
    },
  ],
  'fee-payments': [
    {
      t: 'Beating the bank counter: how payment rails cut tuition transfer costs',
      d: '2026-09-25', mins: 4,
      teaser: 'A real ₹40 lakh transfer, priced three ways on the same afternoon: the spread paid for the student’s first month of groceries.',
      body: [
        'On a benchmark ₹40 lakh tuition transfer, a walk-in bank counter quoted a card rate 1.9% above interbank plus SWIFT charges; a specialist rail (Flywire, Convera, PayMyTuition or TransferMate) locked rates 0.35–0.6% above interbank with fees bundled. The delta on that single transaction crossed ₹55,000.',
        'Rate is not the whole story: reconciliation is. Rail transfers arrive with university-matched reference data, so the bursar posts them without the “unidentified payment” limbo that plagues direct wires. For your students that means no enrolment holds; for you it means a completion-triggered payout that never waits on an email chain to accounts receivable.',
      ],
    },
    {
      t: 'LRS and TCS in 2026: the remittance paperwork checklist every agent should keep',
      d: '2026-09-08', mins: 5,
      teaser: 'Form A2, PAN-Aadhaar linkage, the 20% TCS threshold: what changed, what did not, and where files still get stuck.',
      body: [
        'Under the Liberalised Remittance Scheme, education transfers above the annual TCS threshold attract tax collected at source: creditable against the payer’s final tax, but frightening to parents at first sight. The operative comfort line: TCS on education loans funded through specified lenders still enjoys a concessional rate, and every rupee collected appears in the payer’s Form 26AS.',
        'Documents that must be clean before the transfer is initiated: Form A2 with purpose code S0304-style education classification, university offer and fee invoice, payer PAN, and the LRS declaration. Missing or mismatched invoices are 70% of our hold queue: collect the official invoice, not the offer-letter fee page, before the case moves.',
      ],
    },
    {
      t: 'Why agents should insist on university receipt tracking',
      d: '2026-08-18', mins: 3,
      teaser: '“Paid” is a student claim; “credited” is a university confirmation. Only one of them closes a case.',
      body: [
        'Every year a thin slice of students misses enrolment deadlines not because money was not sent, but because it reached the university unreferenced: parked in suspense accounts while the bursar hunted for the student ID. Dedicated payment rails exist precisely to kill this failure mode with structured remittance data.',
        'Make receipt confirmation a case-closing ritual: the platform stores the university acknowledgement against the request, dates it, and only then marks the transfer complete. In disputes (visa interviews asking for fee proof are the usual case), that artefact holds up where a bank screenshot does not.',
      ],
    },
  ],
  'forex-card': [
    {
      t: 'Arrival money, compared: forex card vs cash vs Indian debit card',
      d: '2026-09-24', mins: 4,
      teaser: 'Three students, three strategies, one month of Toronto spending: the debit card lost by ₹18,000.',
      body: [
        'Cash wins on zero infrastructure but loses on safety and 2–3% worse physical-currency rates. Indian debit cards work everywhere and fail expensively: 3.5% markup plus per-transaction ATM fees compound quietly. The prepaid forex card, loaded at interbank-linked rates before departure, kept the student’s first month at near-zero friction cost and let parents reload from India in minutes.',
        'The professional answer is layered: a forex card as the spending spine, a small cash float for taxis, and the Indian card left for genuine emergencies. Students arriving with this stack report exactly two card problems all season: both solved by the in-app card freeze, not a call home.',
      ],
    },
    {
      t: 'Fourteen currencies, one card: the multi-stop student loading strategy',
      d: '2026-09-05', mins: 4,
      teaser: 'Travelling via Istanbul or Dubai? Currency order on the wallet decides which balance the point-of-sale pulls from.',
      body: [
        'Multi-currency cards hold separate wallets (CAD, USD, EUR and eleven more) and deduct from the wallet matching the transaction currency when funded, converting when not. The strategy that saves conversion fees: preload every transit currency the itinerary touches, even briefly, so a Frankfurt sandwich never settles against the CAD wallet at a poor cross rate.',
        'Reload logic matters during the course too. Parents topping up monthly should load INR-side on soft-rupee weeks where patience allows; the rate lock applies at load, not at spend. Our desk shares a weekly load-window note for exactly this reason: a three-month pattern of good windows is worth roughly one free month of coffee money.',
      ],
    },
    {
      t: 'Starter packs from CAD 300: engineering the Canadian first week',
      d: '2026-08-16', mins: 3,
      teaser: 'GIC money unlocks after activation: the forex card bridges the gap. How much bridge does a new student actually need?',
      body: [
        'The first-week spend pattern for Canada-bound students is remarkably stable: transit and groceries CAD 120–180, a SIM top-up and transit pass CAD 60–90, household basics CAD 100–150. A CAD 300–500 card load, arriving before departure, covers the gap until GIC activation completes, with the safety margin parents ask about on every call.',
        'Because the card is issued and loaded before the flight, the student never queues at an airport counter and never touches dynamic currency conversion machines. Commission triggers on the first successful load, which is also the moment the student stops needing emergency support, a coincidence of incentives we enjoy pointing out.',
      ],
    },
  ],
  insurance: [
    {
      t: 'Visa-compliant insurance: what consulates actually verify on your policy PDF',
      d: '2026-09-23', mins: 4,
      teaser: 'Officers do not read your 40-page policy: they pattern-match five fields. Make sure all five are unmistakable.',
      body: [
        'The checks are consistent across Schengen, UK and most other missions: full name as per passport, coverage dates spanning the travel window, medical coverage sum (€30,000 minimum for Schengen), territorial validity naming the destination, and insurer identification with claim contacts. Policies failing any field invite a refuse-and-resubmit cycle.',
        'All plans issued through the marketplace (Allianz Care, ICICI Lombard, Tata AIG) generate certificates with these fields front-page, same day, visa-refusal refundable. When a student’s dates shift, request date amendment before travel; a reissued certificate reaches you in hours, while a mismatched one at VFS costs the appointment.',
      ],
    },
    {
      t: 'University insurance waivers: the $2,000 saving hidden in the offer letter',
      d: '2026-09-03', mins: 5,
      teaser: 'US universities auto-bill health plans into tuition. Students with qualifying external insurance can waive it: most never try.',
      body: [
        'US campus health plans frequently price between $1,800 and $4,000 a year and are charged by default unless the student files a waiver with proof of comparable coverage. Comparable is defined in the university’s own waiver checklist (deductible ceilings, repatriation cover, mental-health benefits), and student policies from our partner insurers are built to that checklist.',
        'The agent play: flag the waiver deadline (it usually closes two to four weeks after enrolment) at offer-acceptance time, not at fee-payment time. A waiver that submits cleanly returns the full premium to the family budget: the single largest avoidable cost in many US files, and a story that converts next year’s referrals by itself.',
      ],
    },
    {
      t: 'Refund on visa refusal: reading insurance fine print so your students never fight it',
      d: '2026-08-12', mins: 3,
      teaser: '“Refundable on refusal” is standard, but the claim window and evidence list are not. Two dates decide everything.',
      body: [
        'Partner insurer rules converge on this: cancellation for visa refusal is full-refund if claimed before the policy start date with the refusal letter attached; partial or pro-rated after it. The window is generous, and the failure mode is agents and families simply discovering the letter weeks late in a folder nobody checked.',
        'Set the expectation on day one: any refusal notice goes straight into the dashboard case within 48 hours. The desk files the insurer cancellation the same day, the refund traces to the original payment source in 7–10 business days, and the student’s next intake starts with a clean, fresh certificate instead of an argument.',
      ],
    },
  ],
  accommodation: [
    {
      t: 'Booking housing before the visa lands: safe hedge or needless risk?',
      d: '2026-09-19', mins: 4,
      teaser: 'Purpose-built providers designed their cancellation terms for exactly this anxiety: here is how the safety nets actually work.',
      body: [
        'Reputable PBSA (purpose-built student accommodation) providers offer “No Visa, No Pay” and “No Place, No Pay” clauses: produce the refusal letter or the university’s non-confirmation, and the contract unwinds without penalty inside defined windows. The risk profile of booking early is therefore asymmetric: capped downside, meaningful upside of choice inventory and early-bird pricing.',
        'The genuinely risky version is the informal private deposit wired to an unverified landlord. Route every booking through the verified network, pay deposits through the platform’s escrowed rails, and keep the cancellation clause PDF in the student’s file. In popular areas like Zone 2 London, downtown Toronto and central Melbourne, waiting for the visa first means choosing from what is left.',
      ],
    },
    {
      t: 'PBSA vs private rentals: the 50-city cost map for 2026 intakes',
      d: '2026-08-29', mins: 5,
      teaser: 'Stating “students pay $400–$1,500 monthly” is technically true and practically useless. The city is the variable: here is the shape of it.',
      body: [
        'Across our network this season, the PBSA en-suite band runs roughly AUD 380–520 weekly in inner Sydney, GBP 220–340 in prime London postcodes (falling sharply in Leicester, Sheffield and Coventry), and CAD 1,100–1,600 monthly in Toronto versus CAD 750–950 in Winnipeg. Private HMO undercuts PBSA by 15–30% almost everywhere, and transfers the difference into furnishings, bills admin and landlord variability.',
        'Counselling implication: quote city bands, not country bands, and anchor the comparison on total monthly living cost including utilities and commute. PBSA’s all-inclusive pricing often wins the honest comparison in expensive-transit cities; private rentals win where campus walkability removes the transport line.',
      ],
    },
    {
      t: 'Guarantors abroad: how international students actually clear rent checks',
      d: '2026-08-04', mins: 4,
      teaser: '“We need a UK guarantor” stops more bookings than price does. Four mechanisms dissolve it: know all four.',
      body: [
        'The routes, in order of student preference: PBSA providers that waive guarantors for upfront or termly payment; institutional guarantor services (a paid annual fee replaces the human); university-linked housing offices for first-years; and private landlords who accept six months’ advance against no guarantor. Nearly every refusal case we reviewed last season had a workable route the student had not been told about.',
        'Prepare the profile early: admit letter, GIC or loan sanction as means-of-payment evidence, and a clear rent budget unlock most term sheets without negotiation. Log the requirement on the accommodation request when you raise it: the desk shortlists only properties whose guarantor posture fits the student’s actual paperwork, which is why our confirmed-booking rate stays where it is.',
      ],
    },
  ],
  'sim-cards': [
    {
      t: 'Land connected: why pre-activated SIMs beat the airport queue every time',
      d: '2026-09-17', mins: 3,
      teaser: 'The first 90 minutes abroad decide a family’s anxiety level. A working phone at touchdown changes the entire arrival story.',
      body: [
        'Airport SIM retail is designed for tourists: queues, passport photocopies, plan menus decoded under jet lag. A pre-activated SIM delivered to the student’s Indian address flips the sequence: number reserved before travel, plan live from touchdown, and parents on a WhatsApp call before the luggage belt starts moving.',
        'For students, the practical wins compound quickly: the local number goes on bank forms, housing applications and university portals from day one, and plan upgrades happen in-app without a store visit. Commission triggers on activation, the same moment the student’s “landed safe” message lands, which is the kind of aligned incentive we design for.',
      ],
    },
    {
      t: 'Vodafone vs Rogers vs Telus: student plan math for Canada and the UK',
      d: '2026-08-26', mins: 4,
      teaser: 'Marketing pages sell unlimited everything. The real comparison lives in hotspot caps, international minutes and post-promo prices.',
      body: [
        'The student-relevant axes: genuine high-speed data before throttling, hotspot allowance (students tether laptops more than any other segment), minutes to India, and, critically, the price after the promotional quarter ends. Rogers and Telus trade network depth in Ontario and the West respectively; Vodafone UK bundles EU roaming that matters for the weekend-Travel generation.',
        'Our guidance stays needs-first: heavy callers to India price international packs honestly, campus-WiFi students can take leaner data tiers, and anyone on a co-op or placement year should price the full 12-month cost, not the teaser. All three carriers pay identical referral structures on the platform, so the recommendation can be pure student fit.',
      ],
    },
    {
      t: 'eSIM vs physical SIM for Indian students in 2026: the honest contraindications',
      d: '2026-08-01', mins: 3,
      teaser: 'eSIM is elegant until the phone is not. A two-question check decides which format your student should carry.',
      body: [
        'Question one: does the handset support eSIM (iPhone XS onward, most flagships since 2022, but a long tail of budget Androids does not)? Question two: will the student keep the Indian SIM active dual-line? If either answer points physical, order physical: dual-SIM handsets with an Indian primary SIM are still the most common student configuration we see.',
        'Where eSIM fits, it is genuinely better: instant reissue after phone loss, no tray juggling at immigration, and plans switchable in-app. Both formats are delivered pre-activated through the same dashboard flow, with the same activation-triggered payout: choose on hardware and habit, not novelty.',
      ],
    },
  ],
};

export const fmtBlogDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
