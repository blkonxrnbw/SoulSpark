# SoulSpark Resource Guide — v12 (one app: every SoulSpark file, section codes, matched to your live sheet)

**One app, one URL, one sheet.** The unified app, live mandala, binder (HTML + React), community directory, submission form,
old script and setup guide are all folded into these files. Nothing else is needed.

| File | Role |
|---|---|
| `Code.gs` | Apps Script backend: data, accounts, review, edit/delete/merge/tag, uploads, import, archive |
| `index.html` · `app.js` | The guide: Directory, Explore, Match, Calendar, Mandala, Insights, Add/Edit, Inbox |
| `dmm.html` · `dmm.js` | DMM intake page (public) + Responses dashboard and follow-up board (editors) |
| `directory.html` · `directory.js` | **Public directory** with a tab per section, like the old binder (People, Networking, Expos & Shows, Modalities, Stores, Links, Ideas, Vault, Events). Read-only; share it on its own |
| `core.js` | Shared helpers, Astro-Sync + Human Design scoring, Universal Search, section codes + **THE Web App URL** (`DEFAULT_API`) — the only place it lives |
| `style.css` · `img/` | All styling (light + dark, mobile) · logo and mandala-corner background as image files |

**Sheet:** `Code.gs` is pinned to **SoulSpark_Resource_Guide_2**
(https://docs.google.com/spreadsheets/d/1feaVGdRKuZtwKrOPLuM_XbculH5C1soo1QgKuLC7EZQ/edit), so THE URL always reads and writes that sheet,
whichever Apps Script project hosts the code. Its tabs already match v10, so no migration is needed. `runSetup` only adds the 🔑 Section Codes tab and dropdowns. To point at a different sheet later,
add a Script property `SHEET_ID` = that sheet's ID (the part between `/d/` and `/edit`).

## Set up (one sitting, about 10 minutes)

1. Open the Apps Script project behind THE URL (script.google.com → My Projects → the one whose **Deploy → Manage deployments** shows
   `…AKfycbwMhGa8…`). Replace everything in the code file with `Code.gs` → Save. The first run asks you to re-authorize, because it now opens the sheet by ID.
2. **Project Settings → Script properties** (all optional): `TRUSTED_PIN` (submissions with it go live), `NOTIFY_EMAIL`
   (an email per submission), `TRACKER_URL` (old tracker sheet, for `importTracker`). The Phase 1 `ADMIN_PIN` is no longer used; you can delete it.
3. Select **runSetup** → Run. It adds the 🔐 Users tab and any missing tabs; it never deletes data.
4. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy.** The URL stays `…AKfycbwMhGa8…/exec`.
5. Check the new **🔑 Section Codes** tab: every section starts with code **0000**. Change any code by typing over it
   (it takes effect within seconds), or clear the cell to open that section to everyone. Share each code with the people who should see that section.
6. Upload every website file (keep `img/` as a folder). Remove the old `soulspark_unified_SYNERGY.html`,
   `SoulSpark_Directory.html` and `SoulSpark_Submission_Form.html` pages; the guide's **Add** tab and **✦ List your practice** replace them.
7. Open the guide → **Sign in → Create account**. Then, in the sheet's **🔐 Users** tab, type `admin` in your Role cell.
   It takes effect at once. Promote helpers the same way, or from the guide (avatar → Members).
8. Test: open the guide signed out → **🔑 Enter a code** → `0000` → entries appear. Submit a practitioner → approve it in **Inbox** → it shows in the Directory.

## Section codes

| | |
|---|---|
| Who needs a code | Anyone not signed in as an editor or admin, to **see** a section's entries or **add** to it (including the DMM intake form). |
| Default | `0000` for every section (People, Networking, Expos & Shows, Modalities, Stores, Links, Ideas, Vault, Events, DMM). |
| Change a code | Sheet → 🔑 Section Codes → type the new code in the Code column. Each section can have a different code. |
| Open a section to everyone | Leave its Code cell blank. |
| One code, many sections | A visitor types a code once; it opens every section that uses that code. |
| On the visitor's device | Codes last for the browser session (or stay remembered if they tick "Remember on this device"). Rows opened by a code are never saved offline. Settings → "Forget codes on this device" clears them. |
| Changing a code later | Visitors with the old code are asked for the new one the next time the guide syncs. |
| Guessing | The server checks every code; after 50 wrong tries in 10 minutes, unlocking pauses for 10 minutes. |
| Editors & admins | Never asked: signing in opens everything their role allows. |

`runSetup` also adds the sheet dropdowns from the old script's `addDropdownValidation` (HD Type, HD Authority, HD Profile, Meeting Frequency, Application Required).

## What came from each old file

| Old file | Where it lives now |
|---|---|
| `soulspark_unified_SYNERGY.html` | `index.html` + `app.js` (Directory, Explore, Match, Calendar, Mandala, Insights, Add, Inbox, Section visibility) |
| `soulspark_live_mandala_SYNERGY.html` | Mandala tab (same tier glow: in-season / resonant, HD + current season) |
| `soulspark_binder_SYNERGY.html` + both binder `.tsx` files | Section pages → **`directory.html` tabs** (read) and the **Add** form (write). Invite-code gate → **section codes**, checked by the server. Export PDF → **⎙ Print**. **Every binder field is in the sheet:** Networking Format (Online / In-Person / Hybrid), Why This Is Valuable, Cost, Meeting Frequency, Application Required and the Events & Meetups fields (Event / Meetup Name, Host Organization, Event Date / Frequency, Ideal For, Follow-Up Needed); Stores Pricing Notes; People How We Met, Collaboration Notes and Notes; Modalities How You Integrate. |
| `SoulSpark_Directory.html` | `directory.html`: the same public page (hero, search, experience-level filter, modality pills, profile pop-up with alignment and socials), now with Astro-Sync glow and the People section code. The guide's Directory tab covers every section. |
| `SoulSpark_Submission_Form.html` | Add tab and ✦ List your practice |
| `SoulSpark_Script.gs` | `Code.gs` (`addDropdownValidation` → part of `runSetup`) |
| `SoulSpark_Download_and_Setup_Guide.md` | this README |

## Everything else is no longer needed

These 9 files plus `img/` replace every earlier SoulSpark app file. Nothing below is used by v12:

| Old file | Replaced by |
|---|---|
| `soulspark_unified_SYNERGY.html`, `soulspark_unified (3).html`, `index.html` copies of it | `index.html` + `app.js` |
| `soulspark_live_mandala_SYNERGY.html`, `soulspark_live_mandala.html`, `resource_guide_mandala*.html` | Mandala tab |
| `soulspark_binder_SYNERGY.html`, all `*binder*.tsx` files | Directory + Add tabs (the binder's Cost, Meeting Frequency, Application Required, How You Integrate and How We Met fields are now in the sheet) |
| `SoulSpark_Directory.html` | Directory tab (guests see it without signing in) |
| `SoulSpark_Submission_Form.html` | Add tab and ✦ List your practice |
| `SoulSpark_Script.gs` (all versions, incl. the 08 04 26 one with the PIN typed into the code) | `Code.gs` |
| `SoulSpark_Download_and_Setup_Guide.md`, setup/operations manuals, optimization notes | this README |
| `SoulSpark_Connections_Database.xlsx` | identical to `SoulSpark_Resource_Guide_2.xlsx`; the live Google Sheet is the database |
| `Resource_Guide_Tracker*.xlsx`, `Business_Resource_Guide.xlsx` | no rows to import (headers only) |

Keep: the live Google Sheet, your Oct 24 backup copy, and the design screenshots / brand files if you want them for reference.
Your live sheet uses the merged **🎪  Expos & Shows** tab (and its Submissions tab), so v12 has one **Expos & Shows** section that reads and writes it. The old separate "Shows & Events" and "Expos & Markets" tabs are not used and are not recreated.

## Public directory page

`directory.html` is a stand-alone, shareable, read-only page with **a tab for every public section**, like the old binder's sidebar: People, Networking, Expos & Shows, Modalities, Stores, Links, Ideas, Vault and Events (DMM stays private). It reads the same sheet through the same URL and codes as the guide, so anything approved in the Inbox appears on both.
- **Section codes apply per tab.** A locked tab shows 🔒; visitors tap it and enter its code (default `0000`, which opens every section that still uses it). Give a section its own code in 🔑 Section Codes to share it separately, or clear the code to make that tab public.
- **Each tab has its own link**, for example `…/directory.html#networking` or `…/directory.html#events`. Share a single section with one group and another with a different group.
- **People** keeps the full practitioner view: Astro-Sync and Human Design glow (in-season listed first), `data-` attributes for Universal Search, experience level, modality pills, Aligned now and a profile pop-up with alignment and socials.
- **Other tabs** show cards with their type and category tags, dates, location, a short description and a Visit link; tap a card for every public field.
- Private columns (phone, email, notes) never reach this page: the server leaves them out for visitors.

## Binder fields (restored 28 Oct)

Networking gained **Format — Online / In-Person / Hybrid**, **Why This Is Valuable**, **Event / Meetup Name**, **Host Organization**, **Event Date / Frequency**, **Ideal For** and **Follow-Up Needed**; Stores gained **Pricing Notes**. Nothing to set up: each column is added to the sheet automatically the first time an entry uses it.

## What v12 fixes (checked against the live sheet, 27 Oct)

- **Expos & Shows.** v10 and v11 still expected the old separate Shows and Expos tabs; `runSetup` would have created four empty tabs and ignored your real **🎪  Expos & Shows** tab. v12 uses that tab.
- **Repeated Networking columns.** `🤝  Networking` and its Submissions tab each have Cost, Meeting Frequency and Application Required twice. Edits went to the first copy while the app read the second, so changes looked unsaved. v12 reads the first filled copy, and `runSetup` deletes a repeated column when it holds nothing different (it warns instead if the copies differ).

## What v11 added

- **Section codes** for every section (default 0000), checked by the server. See above.
- **⎙ Print / Save as PDF** of the cards shown in the Directory.
- **`level:` search** (Newbie / Intermediate / Advanced) from the old Directory page.
- **Sheet dropdowns** for Human Design and Meeting Frequency, added by `runSetup`.

## What v10 changed from v9

- **Connected to THE URL.** v9 pointed at the retired `AKfycbzg5yEU…` deployment. A browser that remembered an old URL now switches automatically.
- **No admin takeover.** v9 made the first sign-up (or anyone signing up with the owner's email, which isn't verified) an admin. Admin is now granted only in the Users tab, by whoever owns the sheet.
- **Settings out of the code.** `TRUSTED_PIN`, `NOTIFY_EMAIL` and `TRACKER_URL` are Script properties; `OWNER_EMAIL` is gone.
- **Typed text stays text.** A submission starting with `=` (for example `=IMPORTXML(...)`, which could send sheet data elsewhere) is stored as plain text, and HD profiles like `4/1` no longer turn into dates. Approve, edit, tag and import write-backs keep existing cells safe too.
- **Uploads:** images only, up to 5 MB (uploads are shared by link, so other file types were a risk).
- **Private sections stay private:** the old `getSection` link no longer exposes DMM responses to the public.
- **No sign-in hijack:** `?sheet=` links and the Settings URL accept only Apps Script `/exec` addresses, so a crafted link can't send passwords elsewhere.
- **CSV exports** can't run formulas when opened in Excel or Sheets.
- **Brand restored:** the logo and mandala-corner background are back, as small image files.

## Roles

| | member | editor | admin |
|---|:-:|:-:|:-:|
| Submit (goes to review queue) | ✓ | goes live | goes live |
| One practitioner listing, updated any time after first approval | ✓ | ✓ | ✓ |
| See & edit own entries (avatar → My entries) | ✓ | ✓ | ✓ |
| Private columns · Inbox · edit any · tag · merge · revenue · DMM responses | | ✓ | ✓ |
| Delete · manage roles · import | | | ✓ |

Passwords are stored as salted, iterated HMAC-SHA256 hashes. Sessions are signed tokens that last 30 days. Roles are checked on every request, so a demotion or a "blocked" status takes effect immediately. Sign-in locks for 10 minutes after 5 failed attempts. Anonymous submissions still work, and the `TRUSTED_PIN` script property still sends them straight live. Nobody becomes admin by signing up: admin is granted only in the 🔐 Users tab.

## Features

- **Bulk actions**: Directory → ☐ Select. Then Select all shown, ⤓ CSV, + Tag, ⊕ Merge, Delete. Tags become searchable with `tag:vip`.
- **Merge duplicates**: Insights → Possible duplicates (matched on same email, phone or website, or names one or two letters apart). Choose a value per field, or ⊕ Combine all. Every merged-away row goes to 🗄 Archive.
- **Safe edits**: each edit, delete, tag or merge checks that the row still holds the name you saw. If someone else changed it, you get "refresh and try again" instead of an overwrite.
- **Drafts**: the Add form and the DMM form autosave in the browser and restore with a Discard link.
- **Calendar**: month grid plus a 60-day agenda showing events (multi-day spans), ◆ apply-by deadlines, and ⏰ staff follow-ups. Use ⤓ Export .ics for all events, or 📅 Add to calendar on a single event.
- **Revenue** (editors): new staff-only columns **Sales Total** and **Expenses Total** on Expos & Shows and Events. Shows gross, costs, net, margin, average per event, and net by event. When Expenses is blank, the booth fee is used as the cost.
- **Coming up**: anything due in the next 14 days, plus overdue follow-ups. **Follow-Up Date** is a new staff column on People and Networking.
- **Arrange**: ⇅ Arrange next to the section chips or the form fields. Drag with mouse, touch or pen, or use the arrow keys. Saved per browser; Reset restores the default order.
- **Shortcuts**: `/` jumps to search · `Esc` leaves select mode · `Enter`/`Space` opens a focused card.

New columns are added to existing tabs automatically the first time they're written. You don't need to edit the sheet by hand.

## DMM page

`dmm.html` is the shareable intake link. Signed-in editors see a **Responses** tab with these sections:
- headline counts
- format and availability demand
- the people ready to facilitate
- every response
- CSV export

Contact details are never shown publicly.

## Match · find your practitioner

The **Match** tab (link: `index.html#match`) lets a seeker describe what they need, pick modalities they're drawn to, and choose online, in person or either, plus a city. They can also add their own Sun sign and Human Design type. Practitioners are ranked in this order, and every card lists the reasons it was suggested:

1. **Need fit first**: practises a chosen modality (alias-aware), or their bio, keywords or offerings speak to the words the seeker typed. Typing a modality name ("reiki") counts as choosing it.
2. **Practicalities**: works online or in person, based in the chosen city. A practitioner is filtered out only when they clearly don't offer the chosen format.
3. **Timing**: in season or resonant now (the same Astro-Sync scoring).
4. **Resonance, if the seeker opts in**: shared or complementary element (Fire↔Air, Earth↔Water), and Human Design guidance pairs. The pairs follow a SoulSpark convention you can edit in `HD_GUIDE` in `app.js`.

**Training path and years of practice are never part of the ranking.** They're shown on the card so seekers can see them, and that's all. The last search is remembered in the browser.

## Path & lineage

New People fields: **Training Path** (tick any: Certified · Classes & workshops · Family or ancestral tradition · Lineage & apprenticeship · Mentored · Self-taught, listed alphabetically so none comes first), **Years Practicing**, **Teachers & Lineage** and **Classes & Workshops Taken**.

Profiles show a *Path & lineage* panel. All paths use the same badge style, so none looks more official. **Learned from** shows up to three generations, linked when the teacher is also in the directory. **Has taught** lists everyone who names this person as a teacher. Search with `path:self-taught`, `path:lineage` and so on.

## Mandala

- **Cluster by** Modality, Sun, Moon, Rising, Element, HD Type, HD Authority, HD Profile, Gene Keys, Life Path, MBTI, Location, Services (how people serve: Local, Online, In-Person and so on) or Synergy.
- **Modality clusters use Explore's matching**, so "Sound Bath" joins Sound Healing. Lines connect practitioners who share a modality.
- **Practitioners' photos appear inside their nodes.** People without a photo show initials.
- **Click a modality label (or its legend entry) to open it in Explore.** Click a node to open that person's profile.
- **⟳ Rotate** turns the circle slowly, about once every 2½ minutes. It's offered only on computers with a mouse or trackpad, never on phones or tablets, and it's hidden when the device asks for reduced motion. It pauses while your cursor is over a node, and your choice is remembered. Only the moving parts are redrawn each frame; when rotation is off, the circle is drawn once and only the in-season glow animates.
- **Gene Keys** is a new field on People. The Mandala groups by the first key number it finds (e.g. "Life's Work 12.3" → Gene Key 12).

## Universal Search

Free text matches any field. `field:value` matches a card's `data-` attribute. The fields are `hd:` `auth:` `profile:` `sun:` `moon:` `rising:` `element:` `mbti:` `mod:` `loc:` `role:` `sec:` `tag:` `path:`.

## Astro-Sync scoring (unchanged)

| Signal | Points |
|---|---|
| Sun sign = current season | 3 |
| Sun shares the season's element (otherwise) | 1 |
| Moon or Rising = current season | 1 each |
| HD Type or HD Authority resonates with the season's element | 1 each |
| HD Profile contains the transiting Sun line | 1 |

A score of 3 or more is **☉ In Season**; 1–2 is **✧ Resonant**. The element ↔ HD pairings are a SoulSpark convention; edit `HD_RESONANCE` in `app.js` to change them.
