# CISTAC 2.0 — دينار دينار 💙

Mobile-first donation counter (HTML + CSS + JS, no build step).

```
index.html            page
style.css             design
app.js                logic (counter, form, history, confetti)
firebase-config.js    your Firebase keys  <-- you edit this
assets/               put the 2 logos here  <-- you add these
```

## Étape 0 : les logos
Copy your logos into `assets/` with these exact names:
- `ieee-epi-sb.png`
- `ieee-epi-cis-sbc.png`

## Étape 1 : Firebase (obligatoire pour que TOUS les téléphones voient le même compteur)
Without it, each phone only sees its own donations (demo mode).

1. Go to https://console.firebase.google.com → **Add project** (Analytics not needed).
2. **Build → Firestore Database → Create database** → production mode → choose a region (e.g. `eur3`).
3. **Rules** tab → replace everything with the rules below → **Publish**.
4. **Project settings (⚙️) → General → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` values into `firebase-config.js`.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /donations/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['name','amount','createdAt'])
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 2
        && request.resource.data.name.size() <= 30
        && request.resource.data.amount is int
        && request.resource.data.amount >= 1
        && request.resource.data.amount <= 15000
        && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
  }
}
```

## Étape 2 : tester en local
ES modules need a server (double-click on index.html will not work):

```
npx serve .
# or
python3 -m http.server 8000
```
Open http://localhost:8000

## Étape 3 : déployer (gratuit)
Easiest options:
- **Netlify Drop**: https://app.netlify.com/drop → drag the whole project folder → you get a link.
- **Vercel**: `npx vercel` in the folder.
- **GitHub Pages**: push to a repo → Settings → Pages → deploy from `main`.

Then share the link with your members (a QR code of the link works great at events).

## Notes
- The goal (15000) is the `GOAL` constant at the top of `app.js`.
- This app **records pledges/donations**; it does not process payments. Collect the real money yourselves (cash, D17, bank…) and, if needed, delete wrong entries from the Firebase console (Firestore → `donations`).
- Anyone can submit a donation entry (no login), so the rules above limit what can be written, but a determined person could still add fake entries. For a student event this is usually fine.
