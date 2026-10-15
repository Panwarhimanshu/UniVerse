# UniVerse Partner App

UniVerse partner platform: website, back office, API and mobile app.

```
web/      React + Vite + TypeScript website (marketing site, 9 service pages, partner dashboard)
server/   Node.js + Express + TypeScript + MongoDB Atlas (API under /api; also serves web/dist)
mobile/   React Native + Expo (SDK 57, expo-router)
```

## Website

```bash
cd server && npm run dev        # API on :4000, connected to MongoDB Atlas (server/.env)
cd web && npm run dev           # website on http://localhost:5173 (proxies /api to :4000)
```

Production: `cd web && npm run build`, then start the server. It serves the built site and the API together on
port 4000 (`http://localhost:4000`). Pages: `/`, `/services/:key`, `/partner-login`, `/agent-login`
(`?tab=signup`), `/dashboard/:view` (overview, whatsnew, students, requests, services, wallet, commissions, profile, users).

Marketing content (services, insights articles) lives in `web/src/data/`. Partner data (students, cases, chats,
documents, wallet, team, agreement requests) is stored in MongoDB.

### Back office (`/admin`)

The service desk and relationship managers run everything from `/admin`: move cases through their stages, verify or
return documents, reply in case chats and RM chats, credit commissions, pay or reject withdrawals, verify partners,
assign RMs, reset partner passwords and handle agreement requests. Nothing on the partner side changes on its own;
every reply and status change comes from someone in the back office.

The first back-office login is created at server start from `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in
`server/.env` (only when no back-office account exists yet). Change the password from the account menu after the first
sign-in. Staff sessions last 12 hours.

### Master admin

The master admin signs in at the same `/admin` page and gets everything staff have, plus:

- **Staff accounts**: create back-office logins for RMs and desk staff, choose which sections each can use
  (Cases, Partners, RM messages, Payouts, Agreement requests), reset passwords, disable or delete them.
- **Partners → Manage**: edit any partner detail, correct a wallet, suspend (signs out the partner and their team and
  blocks sign-in) or permanently delete a partner and all their data.
- **Services**: edit service text, key figures, commission rate and the documents requested when a case opens,
  or hide a service from the site and new referrals.
- **Insights**: add, edit and delete the articles on service pages and in the partner What's New feed.
- **Settings**: support email and phone, minimum withdrawal, commission effective date, default RM for new partners.
- **App usage**: active partners today, this week and this month; daily users of the app and of the website;
  the most opened screens; what partners did (referrals, uploads, messages, withdrawals); the most active partners and
  recent sign-ins. Usage records are kept for 180 days.
- **Activity log**: every change made in the back office and who made it.

The master login is created at server start from `MASTER_NAME`, `MASTER_EMAIL` and `MASTER_PASSWORD` in `server/.env`
when no master exists. Content edits are stored in MongoDB and served from `GET /api/content`, so the website and the app
pick them up without a code change.

### Real figures only

Every number on the public site comes from the database through `GET /api/content` (`stats`): live services, delivery
partners, destinations, and partners, students and completed services once they exist. Nothing is invented. New
partners are assigned the "UniVerse Partner Desk" until the master admin sets a relationship manager. The commission
history is built from real rate changes: when the master admin changes a rate, the previous structure is archived.

Partners and team members can upload a profile photo (JPG, PNG or WebP, up to 2 MB) from the account menu on the
website or the Profile screen in the app. The partner overview has an analytics section: completion rate, average time
to complete, documents waiting, referrals and earnings per month, and cases by status and service.

### Team logins

Partner owners add team members under User Management with a temporary password. Members sign in at the normal
partner login and only see the menus and actions the owner allowed; the API enforces the same rules. Removing a member
signs them out immediately.

## Notifications, email and security

- **Push notifications** (Android, through Firebase): replies from the desk and the RM, stage changes, documents
  returned, commissions and payouts. Tapping one opens the case or chat. They also show while the app is open.
  Needs `secrets/google-services.json` (copied into `mobile/` before building) and the Firebase service account key
  (`FIREBASE_SERVICE_ACCOUNT_FILE` locally, `FIREBASE_SERVICE_ACCOUNT` on Vercel).
- **Email** over SMTP (`SMTP_*` in `server/.env`): welcome on sign-up, password reset links, desk and RM replies, completed
  cases, returned documents, commissions and payouts. Routine stage changes are push-only.
- **Forgot password**: a link valid for 30 minutes, usable once, from the sign-in page on the website and in the app.
- **Sign-in limit**: 5 wrong passwords for one email in 15 minutes locks that email until the window passes (partner and
  back-office logins). A password reset clears it.
- **Exports**: Cases, Partners and Payouts have an "Export to Excel" button (CSV).
- **Backups**: `cd server && npm run backup` saves the whole database, documents included, to `backups/<date>/`.
  Atlas free clusters have no automatic backups, so run this regularly (or move to a paid cluster with backups on).

## Live site

- Website: https://universeportal.vercel.app (back office at `/admin`)
- API: https://universeportal-api.vercel.app/api (the website forwards `/api` to it)

Both are Vercel projects deployed from `web/` and `server/` with `npx vercel deploy --prod`. The API's settings
(database, JWT secret, master login) are Vercel environment variables, not files in the repo. Uploaded documents are
stored in MongoDB (GridFS), up to 4 MB each.

## Mobile app

The app uses the same live API as the website, so partners, team members and staff share one set of data, and the
back office and master admin manage the app too. It needs an internet connection.

To test against a local server instead, start it with the API address (use your computer's network IP on a phone):

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:4000/api npx expo start --web
```

Tabs: Home · Cases · Students · Wallet. Everything else (RM chat, analytics, What's New, services, commissions,
updates, agreement, team, password) is on the Profile page, opened from the photo at the top left.

**Request a service** (the + button): choose one of your students to fill in their name, phone and email, or type a
new student. Email is required. Pick one or more services from the grid; each opens its own case. Destinations are the
main study countries plus "Other", which opens a searchable list of every country. A service that is already active
for the student is not opened twice.

Screens: Home (figures, updates, shortcuts, recent cases, RM) · Analytics (requests and earnings per month, cases by
status and service, completion rate) · Profile (photo, details, sign out) · Cases · Case detail (stage timeline, documents with
upload and download, desk chat) · Students · Student record (edit, raise several services) · Wallet + withdraw ·
Sign in / Sign up. Team members only see the tabs and actions their owner allowed.

**Android build:** the OneDrive path is too long for the native build (Windows 260-char limit), so the APK is built
from a copy in `C:\uv`: copy `mobile/` there (without `node_modules` and `android`), run `npm install`, then
`npx expo prebuild -p android --clean` and `cd android && gradlew assembleRelease`. The latest APK is saved as
`UniVerse.apk` in this folder.

## API

| Method | Path | |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | returns `{ token, agent }` |
| GET/PATCH | `/auth/me` | profile |
| GET | `/dashboard` | stats, recent cases, service mix |
| GET/POST | `/requests` | list (`?q=&status=`) / refer a student |
| GET | `/requests/:id` | case detail |
| GET/POST | `/requests/:id/messages` | case chat |
| POST | `/requests/:id/documents` | multipart `file`, optional `docId` |
| GET | `/wallet` · POST `/wallet/withdraw` | |
| GET/POST | `/rm/messages` | relationship-manager chat |
| GET | `/services`, `/commissions`, `/meta` | catalogue data |

| POST | `/auth/password` | change your own password |
| GET/POST/PATCH/DELETE | `/team`, `/team/:id` | team members (owner only) |
| GET | `/requests/:id/documents/:docId/file` | download an uploaded document |
| * | `/admin/...` | back office (staff token from `/admin/login`) |

Everything except `/auth/register|login` and `/admin/login` needs `Authorization: Bearer <token>`.
Desk and RM replies come from staff in the back office; there are no automatic replies.
