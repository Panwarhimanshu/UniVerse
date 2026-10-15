# Notifications

How partners hear about what happens on their account, in the app, in the partner portal, on their phone and by email.

## Flow

```
 something happens             notify()                    channels
 (back office, partner,  ──►   server/src/notify.ts  ──►   1. in-app record (always)
  master admin)                                            2. push to their phones (if allowed)
                               who receives it?            3. email (if allowed)
                               owner + team members
                               whose access covers it
```

1. **An event happens.** Every place in the server that changes something a partner cares about calls
   `notify({ agent, category, type, title, body, link, audience })`. Nothing is inferred from chat text.
2. **Recipients are chosen.** The account owner always gets it (unless they caused it). Team members get it when
   their menus cover it (the `audience`):
   - `all`: everyone on the account
   - `requests`: people who can open Cases
   - `wallet`: people who can see the Wallet
   - `owner`: the owner only
3. **One in-app record per recipient** is saved in the `notifications` collection with its own read state, so each
   person has their own unread count. Records are kept for 6 months.
4. **Push** goes to the phones that person is signed in on, when push is on for that category. Phones that uninstalled
   the app are forgotten automatically.
5. **Email** goes to that person's email, when email is on for that category and the event allows email.
6. **The app and portal pick it up:**
   - The unread count is checked every 20 seconds while the app or portal is open, when the app comes back to the
     front, and the moment a push arrives.
   - A new notification shows as a banner at the top of the app. Tapping it (or the push) marks it read and opens
     the case, wallet, RM chat or profile it is about.
   - Read state is stored on the server, so reading on the phone also clears it on the website.

## Categories and defaults

Each person can change push and email per category (app: Profile → Notification settings; portal: Profile →
Notifications). In-app is always on.

| Category | What it covers | Push | Email |
| --- | --- | --- | --- |
| Case progress | Completed, on hold; stage changes and team member requests are in-app and push only | On | On |
| Documents | Requested, returned, verified | On | On |
| Messages | Desk replies on a case, RM messages | On | On |
| Payments | Commissions credited, pending, cleared, cancelled; withdrawals paid or rejected | On | On |
| Account | Welcome, verification, RM change, reactivation, agreement requests handled | On | On |
| News from UniVerse | Announcements from the master admin | On | Off |

## Events

| Type | Sent when | To | Opens |
| --- | --- | --- | --- |
| `account.welcome` | A partner signs up | Owner | Profile (in-app only; the welcome email is separate) |
| `case.created_by_team` | A team member requests services | Owner | Case (no email) |
| `case.stage` | The desk moves a case to a new stage | Cases | Case (never emailed) |
| `case.completed` | A case is completed | Cases | Case |
| `case.on_hold` | A case is put on hold | Cases | Case |
| `message.desk` | The desk replies in a case chat | Cases | Case |
| `message.rm` | The RM writes in the RM chat | All | RM chat |
| `document.requested` | The desk asks for another document | Cases | Case |
| `document.returned` | A document is sent back to upload again | Cases | Case |
| `document.verified` | A document is verified | Cases | Case (never emailed) |
| `payment.commission_credited` | A commission is credited to the wallet | Wallet | Wallet |
| `payment.commission_pending` | A commission is added as pending | Wallet | Wallet |
| `payment.commission_cleared` | A pending commission clears | Wallet | Wallet |
| `payment.commission_rejected` | A pending commission is cancelled | Wallet | Wallet |
| `payment.withdrawal_paid` | A withdrawal is paid | Wallet | Wallet |
| `payment.withdrawal_rejected` | A withdrawal is rejected (money returned) | Wallet | Wallet |
| `account.verified` / `account.unverified` | Verification changes | All | Profile |
| `account.rm_changed` | A new RM is assigned | All | RM chat |
| `account.reactivated` | A suspended account is reactivated | All | Nothing |
| `account.agreement_closed` | An agreement request is handled | Owner | Profile |
| `announcement` | The master admin sends an announcement | All | Nothing |

"Cases" means the owner and team members who can open Cases; "Wallet" the owner and members who can see the Wallet.

## Adding a new notification

1. Pick the category (or add one to `CATEGORIES` in `server/src/notify.ts` and to `CATEGORY_META` in
   `mobile/src/lib/updates.tsx` and `NOTIF_LABEL` in `web/src/dashboard/Dashboard.tsx`).
2. Call `notify()` right after the change is saved, with a short title (shown in bold) and a one or two sentence body.
   Use `audience` so only people who can act on it receive it, `except` to skip the person who caused it, and
   `email: false` for routine confirmations.
3. Add it to the events table above.

## API

| Call | Purpose |
| --- | --- |
| `GET /api/notifications?category=&before=&limit=` | Newest first, with `unread` and `more` for paging |
| `GET /api/notifications/unread` | `{ count, latest }`, the cheap check used for the badge |
| `POST /api/notifications/read` | `{ ids: [...] }` or `{ all: true }` |
| `GET` / `PUT /api/notifications/preferences` | Push and email per category |
| `POST /api/auth/devices` / `DELETE /api/auth/devices` | Register or remove a phone for push |
| `GET` / `POST /api/admin/master/announcements` | Master admin: list and send announcements |

## Setup

- **Push** needs a Firebase project: `secrets/google-services.json` is copied into `mobile/` before building the app,
  and the service account key goes in `FIREBASE_SERVICE_ACCOUNT_FILE` (local) or `FIREBASE_SERVICE_ACCOUNT` (Vercel).
  Without it, everything else works and push is skipped.
- **Email** needs `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`. Without them, emails are
  skipped and logged.
