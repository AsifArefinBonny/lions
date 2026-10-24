# Lions club website template

A fast, mobile-first website for a Lions club, set up here for the **Lions Club of Dhaka Oasis**.
It is built to be copied: every club-specific detail is content, so another club can be onboarded without touching code.

- **Free to run.** Static pages served by Cloudflare Pages, built from a GitHub repository. No server to maintain.
- **Edited in the browser.** Officers sign in at `/admin/` and fill in forms. Saving publishes the change in about two minutes.
- **English and Bangla.** English at `/`, Bangla at `/bn/`. Untranslated content falls back to English.

## What the site includes

| Section | Address | Notes |
|---|---|---|
| Home | `/` | Banner, numbers, upcoming events, service areas, impact counters, president's message, latest bulletin |
| About | `/about/` | Club history, club profile, milestones, club pledge |
| Events | `/events/` | Upcoming events with "add to calendar", plus recent ones |
| Activities | `/activities/` | Timeline of everything the club has done, filtered by year and month |
| Members | `/members/` | Searchable directory |
| Member profile | `/ln-asifarefinbonny/` | One shareable page per member, with share and "save contact" buttons and a QR code |
| Founder | `/founder/` | Portrait, biography and the founder's writings |
| Photo gallery | `/gallery/` | Every photo attached to an event or activity, grouped by event |
| Birthdays and anniversaries | `/greetings/` | Day and month only, for members who agree to share them. The home page greets them on the day. |
| Committee | `/committee/` | Current committee, older years kept below |
| Past presidents | `/past-presidents/` | |
| Leo Club | `/leo/` | Leo members (profiles at `/leo-name/`), Leo Advisor and Leo activities |
| Monthly bulletin | `/bulletin/` | Latest issue featured, archive filtered by year and month, page-by-page reader |
| Donate | `/donate/` | bKash, Nagad or bank details with copy buttons, and projects to sponsor |
| Join | `/join/` | Reasons to join, steps, questions and a membership enquiry form |
| District clubs | `/clubs/` | Links to other clubs' websites |
| Resources | `/resources/` | Documents to download and useful links |
| Contact | `/contact/` | Contact form, club details, live chat |
| Admin | `/admin/` | Content editor |

## Run it on your computer

```bash
npm install
npm run dev        # http://localhost:4321
```

To try the editor locally, open `http://localhost:4321/admin/` in Chrome or Edge, choose **Work with Local Repository** and pick this folder.

## Put it online (once per club)

The content lives in a GitHub repository, GitHub builds the site, and Cloudflare Pages serves it. Both are free and neither needs a payment card.

1. **GitHub:** create a **public** repository and push this folder to its `main` branch.
2. **Cloudflare:** create a free account at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
   - Copy the **Account ID** (shown on the account's overview page).
   - Under **My Profile → API Tokens → Create Token**, make a custom token with the permission **Account → Cloudflare Pages → Edit**.
3. **GitHub repository → Settings → Secrets and variables → Actions:**
   - Secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
   - Variables: `CF_PAGES_PROJECT` (a short name such as `dhaka-oasis`) and `SITE_URL` (`https://dhaka-oasis.pages.dev`, or the club's own domain once it is connected).
4. Run the **Deploy site** workflow from the repository's **Actions** tab (or push any change). The site goes live at `https://<project>.pages.dev`.

For the club's own domain, open the project in Cloudflare under **Workers & Pages → Custom domains**, add the domain, then change the `SITE_URL` variable to it.

The site also rebuilds every night so finished events move off the "upcoming" list. GitHub pauses scheduled runs after 60 days without any change to the repository; any edit starts them again.

### Limits to know about

- Cloudflare Pages publishes up to 20,000 files and nothing over 25 MB, so keep each bulletin PDF under 25 MB.
- Photos uploaded in the editor are saved as high-quality WebP (up to 2560px); PDFs are stored untouched.
- GitHub recommends keeping a repository around 1 GB. Every build prints the current sizes and warns well before any limit.

## What can be changed in the editor

Everything a visitor reads or sees: events and activities (past ones too, just pick an earlier date), photos, members, Leo members, committees, bulletins, every page's heading and introduction, the home page banner photo, a banner photo for any other page, colours, logo, contact details and which sections are shown. The only fixed parts are short button labels such as "Read now", which live in `src/i18n/ui.ts`.

## Signing in to the editor (several people can)

Each editor needs a free GitHub account with write access to the repository (**Settings → Collaborators → Add people**). There is no limit on the number of editors, each signs in as themselves, and the repository history shows who changed what. Removing someone from Collaborators removes their access.

- **Quickest:** on `/admin/` choose **Sign In Using Access Token** and paste a GitHub personal access token with access to this repository.
- **Nicer for officers:** deploy the free [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) to Cloudflare Workers, then save its address in **Club settings → Admin sign-in service address**. After that the **Sign In with GitHub** button works with no token.

## Member portal: members update their own profile

Members sign in at `/account/` with a link sent to their email (no password) and can change only their own photo, profession, contact details, social links, short biography, and birthday or anniversary. They cannot change their name, their position, or anything else on the site. What they save appears on the website within about half an hour.

There are two kinds of account:

| Who | Signs in at | Can change |
|---|---|---|
| Site admins (a few people) | `/admin/` with GitHub | Everything |
| Members | `/account/` with their email | Only their own profile |
| Portal admins (listed in Firebase) | `/account/` with their email | Which email belongs to which member, and any member's profile |

### One-time setup (about 10 minutes, free)

1. At [console.firebase.google.com](https://console.firebase.google.com) create a project (the free "Spark" plan; no card needed).
2. **Build → Authentication → Sign-in method:** enable **Email/Password**, and inside it also enable **Email link (passwordless sign-in)**.
3. **Authentication → Settings → Authorized domains:** add the website's domain (for example `yourname.github.io` or your custom domain).
4. **Build → Firestore Database:** create a database in production mode, then open **Rules**, paste the contents of `firestore.rules` from this folder and publish.
5. In Firestore, create a collection named `admins` and add a document whose ID is your own email address in lowercase (it needs no fields). That makes you a portal admin.
6. **Project settings → Your apps → Web app:** register an app and copy `apiKey`, `authDomain`, `projectId` and `appId` into the editor under **Club settings → Member portal (Firebase)**. These four values are meant to be public.

### When a member leaves

In `/admin/`, open the member and tick **No longer an active member** (or delete the entry). On the next publish they disappear from the website, committees and greetings, and the SMS job stops texting them even if their number is still stored. In the portal's **Member access** list, press **Remove** next to them as well.

### When a new member joins

1. In `/admin/`, add them under **Members** (name and profile link name). From the moment it is published they appear on the website, and they receive greetings and SMS once their dates and number are added.
2. In `/account/`, signed in as a portal admin, pick the member under **Member access** and enter their email.
3. Tell the member to open `/account/`, type that email and follow the link they receive.

### Good to know

- Photos are shrunk in the member's browser and stored inside their profile record, so no paid file storage is needed.
- Everything a member types is checked before the site uses it: links must be normal web addresses and text is shown as plain text.
- The check for profile changes runs every 15 minutes on GitHub's schedule, which can run late at busy times.

## SMS to members (TextBee)

The club can text its members: a reminder the day before any event ticked **Send an SMS reminder**, a greeting on birthdays and anniversaries, and one-off messages. It uses [TextBee](https://textbee.dev), which sends through an Android phone and its SIM, so messages arrive from the club's own number.

- **Cost:** TextBee's free plan allows 50 SMS a day and 300 a month, with no card. The SIM's normal SMS charges still apply, so use a SIM with an SMS bundle.
- **The phone** (Android 7 or newer) must stay switched on and online. iPhones cannot be used.
- **Message length:** an English SMS holds 160 characters and a Bangla one 70; longer texts are sent, and charged, as several SMS.

### Setup

1. Sign up at textbee.dev, install the TextBee app on the club phone and pair it by scanning the QR code in the dashboard.
2. Create an API key in the dashboard and save it in the GitHub repository as the secret `TEXTBEE_API_KEY`.
3. Give the sender the members' mobile numbers, which stay private either way:
   - **From the member portal:** members enter their number under "For club notices only" at `/account/`. In Firebase open **Project settings → Service accounts → Generate new private key** and save the whole file's contents as the secret `FIREBASE_SERVICE_ACCOUNT`.
   - **Or as a list:** save a secret named `SMS_CONTACTS` such as `{"ln-asifarefinbonny": "01XXXXXXXXX", "ln-skshakilahmed": "01XXXXXXXXX"}`.
4. In the editor, switch on **Club settings → SMS to members**, and choose the language and wording there.

### Sending

- **Automatic:** every day at 9 am the **SMS to members** workflow sends that day's greetings and the reminders for tomorrow's flagged events.
- **A one-off message:** in the repository open **Actions → SMS to members → Run workflow**, type the message and run. Tick "Only show what would be sent" first to check the wording and the number of recipients.

Mobile numbers are never written to the logs.

## Switching on the contact form and live chat

Both are free services, set in the editor under **Pages & Settings → Club settings**:

- **Contact form:** create an access key at [web3forms.com](https://web3forms.com) with the club's email address and paste it in.
- **Live chat:** create a widget at [tawk.to](https://www.tawk.to) and paste the property ID and widget ID. Until then, a WhatsApp button is shown if a WhatsApp number is set.

## Publishing the monthly bulletin

In the editor: **Monthly Bulletin → New**, give it a title and month, upload the PDF and save. The build turns the PDF pages into an online reader and uses the first page as the cover.

Everything in the uploaded PDF becomes public. Upload a public edition that leaves out the accounts, dues list and bank details.

## Privacy

The repository is public, so anything saved in the editor can be read by anyone, including member phone numbers and emails if they are filled in. Only add contact details a member has agreed to publish.

## Setting up another club

```bash
npm run new-club -- --name "Lions Club of Dhaka Central" --short "Dhaka Central" --yes
```

This clears the sample content and sets the new club's name. Then push to that club's own repository, follow "Put it online", and add the logo, colours, contacts and content in the editor. Sections a club does not want (and the Bangla version) can be switched off under **Club settings → Sections to show**.

## Where things live

```
src/data/           club settings and the content of single pages (home, donate, join, Leo, clubs, resources, past presidents)
src/content/        events, members, Leo members, bulletins, committees, about page
src/assets/uploads/ images added through the editor
public/files/       bulletin PDFs and downloadable documents
src/pages/          the pages themselves
src/i18n/ui.ts      fixed interface text in English and Bangla
```
