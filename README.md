# Dinner Planner

A shared dinner planner for two phones. Plan the week (Monday to Sunday), get a shopping list grouped by aisle, cook step by step, keep every recipe in one book. It installs on your home screen like a normal app and works with no signal.

Everything is plain HTML, CSS and JavaScript. There is nothing to build or install.

## What you get

- **Week**: shuffle all seven dinners, shuffle only the unlocked ones, or pick each night yourself. Lock a night you like, swap one you don't, roll the dice on a single night, or mark a night as takeaway or eating out. Sides and desserts can be added to any night.
- **No boring weeks**: the shuffle never repeats a dish in the same week, never puts the same category on two nights in a row, and avoids anything you cooked in the last few weeks (you can change how many in Settings).
- **Shopping list**: built from the week, grouped by aisle, duplicates merged (two recipes needing onions become one line). Tick things off in the shop. Add your own extras (milk, bin bags) and they are kept separate and tagged EXTRA.
- **Recipes**: 65 starter recipes from your cheat sheet, all editable. Add photos, macros, your own categories (Greek, Breakfast, whatever) and your own recipe types (Dessert, Side).
- **Cook mode**: one step at a time in big text, with the ingredients for that step, and the screen stays awake.
- **New week**: clears the dinners and the shopping list, keeps the old week in Past weeks, and can carry over any unticked extras.

## Set it up (about 15 minutes, once)

### 1. Put the app online with GitHub Pages

1. On this repository on github.com, tap **Settings**, then **Pages** (in the left menu).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set the branch to **main** and the folder to **/ (root)**, then tap **Save**.
4. Wait a minute or two and refresh. GitHub shows your link, something like `https://hintonelectrics.github.io/dinner-planner/`.

### 2. Add it to both phones

- **iPhone**: open the link in **Safari**, tap the Share button, then **Add to Home Screen**.
- **Android**: open the link in **Chrome**, tap the three dots, then **Install app** (or **Add to Home screen**).

At this point the app works on each phone on its own. The next step makes the two phones share everything.

### 3. Make the two phones share (free database)

1. Go to [supabase.com](https://supabase.com), sign up (free) and create a new project. Any name, any region near you. Save the database password somewhere.
2. When the project is ready, open **SQL Editor**, then **New query**.
3. Open the file `supabase/setup.sql` from this repository, copy everything in it, paste it into the query box and tap **Run**. You should see "Success".
4. Go to **Project Settings**, then **API** (or **API Keys**). Copy two things: the **Project URL**, and the **anon public** key (or the **publishable** key, whichever your project shows).
5. On GitHub, open the file `js/config.js`, tap the pencil to edit it, paste the URL and key between the quotes, and tap **Commit changes**.
6. Wait a minute, then fully close and reopen the app on your phone.

### 4. Link your phones

1. On your phone, open the app, tap the cog (top right), then **Start new household**.
2. Tap **Copy invite link** and send it to your wife (WhatsApp is fine).
3. She taps the link on her phone, then **Join**. From then on, anything either of you changes shows up on the other phone within a few seconds.

**Treat the invite link like a password.** The household code inside it is the only thing protecting your data. Don't post it anywhere public. Anyone who doesn't have the code cannot read or change anything, even if they find the database key.

## Good to know

- **Photos** are shrunk to a sensible size on the phone before saving, and stored in your database. The free Supabase plan has plenty of room for hundreds of dish photos.
- **No signal in the shop?** The list still opens and you can still tick things off. It syncs when you're back online.
- **Nothing lost**: recipes and plans are saved on the phone itself, and in the database if sync is on.
- **Macros** on the starter recipes are rough estimates. Edit any recipe to put in your own numbers.
- **Updating the app**: change the files on GitHub and the phones pick it up next time they open the app with signal. If a change ever seems to be missing, close the app fully and reopen it.
- **Free Supabase projects pause after a week with no use.** If the app says it can't reach the database after a long break, open your project on supabase.com and tap **Restore**.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page |
| `css/style.css` | How it looks |
| `js/app.js` | Screens and behaviour |
| `js/store.js` | Saving on the phone and syncing between phones |
| `js/seed.js` | The 65 starter recipes |
| `js/config.js` | Where you paste the Supabase URL and key |
| `sw.js`, `manifest.webmanifest`, `icons/` | Makes it installable and lets it work offline |
| `supabase/setup.sql` | One-time database setup |
