# Security checklist - Learning Tracker

The code and `firestore.rules` in this repo are hardened. A few protections can only be switched on in the
Google/Firebase consoles - please do these once. **Top priority first.**

## 1. Lock down the Realtime Database (HIGH - do this now)
Your Firebase project has a **Realtime Database** created in "test mode" (rules: `.read`/`.write` = anyone,
until a date). This app does not use it, so anyone on the internet could read/write it.

Firebase Console -> **Realtime Database** -> **Rules** -> replace everything with:

```json
{ "rules": { ".read": false, ".write": false } }
```
Publish. (Or delete the database if you will never use it.)
Also check **Storage** (if enabled): rules should be `allow read, write: if false;`.

## 2. Publish the new Firestore rules
Firebase Console -> **Firestore Database** -> **Rules** -> paste `firestore.rules` -> Publish.

## 3. Restrict the API key to your website
The Firebase web `apiKey` in `config/firebase.js` is public by design, but restrict where it works:
Google Cloud Console -> APIs & Services -> **Credentials** -> your *Browser key* -> Application restrictions
-> **Websites** -> add `https://<your-github-username>.github.io/*` (and `http://localhost:*` for testing).

## 4. Authentication settings
Firebase Console -> **Authentication**:
- **Settings -> User actions**: enable *Email enumeration protection*.
- **Settings -> Authorized domains**: keep only `localhost`, `<project>.firebaseapp.com`, and your github.io domain.
- **Settings -> Password policy** (if available): require 8+ characters, upper/lower case and a number.
- **Templates**: check the *Email address verification* and *Password reset* emails look right.

## 5. (Recommended) App Check - stops bots from abusing your database
Firebase Console -> **App Check** -> register the web app with **reCAPTCHA v3** (or Enterprise), then
*Enforce* for Cloud Firestore and Authentication. Then add the App Check SDK + site key to `config/firebase.js`
(ask for help if you want me to wire it in).

## 6. Optional: Subresource Integrity for CDN scripts
Run `bash tools/generate-sri.sh` on your computer and paste the printed tags over the matching ones in
`index.html`. This makes browsers reject a CDN file if it is ever tampered with.

## What the code already does
- All user text is HTML-escaped; click-handler arguments go through `Utils.js()` (safe JS string literals).
- Only `http(s)` links are accepted for resources; links open with `rel="noopener noreferrer"`.
- Content-Security-Policy + referrer policy, clickjacking frame-buster.
- Passwords: 8+ chars with a letter and a number, confirm-password at sign-up, no "does this account exist" leaks on sign-in.
- Email verification required to accept invitations or use Study Buddies (invites are matched by email).
- Firestore rules: default deny, shape/size validation on every document, ownership checks,
  members can only change their *own* reaction / vote / done mark, no spoofing of names/emails in buddy requests.
- CSV export neutralises spreadsheet formulas (`=cmd|...`).
- Service worker never caches error responses.
