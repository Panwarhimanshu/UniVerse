============================================================
  UniVerse Partner Portal — Demo Build
============================================================

WHAT'S INSIDE
-------------
  index.html          Marketing site (home)
  services/           9 product pages (GIC, Blocked Account,
                      Education Loans, Insurance, Forex Card,
                      SIM Cards, Fee Payments, OSHC/OVHC,
                      Accommodation)
  agent-login.html    Partner sign-in screen (demo credentials
                      are shown on the page itself)
  agent-dashboard.html  Partner dashboard: requests, case
                      dialogs with chat + document uploads,
                      commission structure history, wallet,
                      RM chat drawer
  assets/             Styles, scripts, logo and imagery

HOW TO RUN (pick one)
---------------------
Option A — quickest:
  Simply double-click  index.html  — the whole site works
  straight from the file system in any modern browser
  (Chrome / Edge / Firefox).

Option B — local server (recommended for the smoothest
demo, avoids any browser file:// restrictions):

  Windows:   unzip, open a terminal in this folder, then:
             python -m http.server 8080
  macOS/Linux: same command.
  Then open  http://localhost:8080  in your browser.

DEMO WALKTHROUGH (suggested 5-minute flow)
------------------------------------------
  1. Home page        → hero, 15-destination flags, all
                        Value Added Services, how-it-works,
                        coverage counters.
  2. Any service card → dedicated product page (journey
                        steps, partner cards, FAQs).
  3. "Partner Login"  → use the demo credentials shown.
  4. Dashboard        → KPIs, wallet, commissions history
                        (View Details on Current/Previous).
  5. Requests tab     → click any row: status, document
                        cards, per-case chat, file upload
                        (📎), RM contact CTA.
  6. RM card          → bottom-left card opens the floating
                        RM chat drawer.

NOTES
-----
  • All data is demo/seed data stored in the browser —
    nothing is sent anywhere; safe for internal demos.
  • Internet is optional: Google Fonts enhance the look
    when online, but everything works offline too.
  • Minimum GIC amounts reflect CAD 23,448 (2026 requirement).
============================================================
