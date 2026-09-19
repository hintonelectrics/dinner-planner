# Task: build "Dinner Planner", a shared meal-planning phone app, in this GitHub repo

I'm Tom. I'm an electrician, not a developer, so explain anything I have to do in plain, numbered, tap-by-tap steps. Do as much as possible yourself (create files, commit, push, switch on GitHub Pages if you have the access). Only ask me for things you cannot do.

## What it is
An installable web app (PWA) for me and my wife. It holds all our dinner recipes across different cuisines. At the start of each week (shop day) it gives us a randomised set of different dinners, one per day. We can swap any dinner, pick dinners ourselves, or randomise just one day. The chosen dinners appear on a calendar-style week view, and the ingredients build a shopping list automatically.

It must look and feel like a real app: installable to the home screen on iPhone and Android (manifest, icons, service worker, standalone display, safe-area padding), fast, works offline for viewing and ticking off the shopping list, and syncs between our two phones.

## Look and feel
Simple, clear, photo-led, inspired by the Mob recipe app (mob.co.uk): big bold headings, bright lime accent, black text, very few tabs.
- Colours: page ground #F5F7DC, cards #FFFFFF, ink #111411, muted #6B7061, lines #E3E7C8, lime #D6E84A, chip #EBEFCB. Dark mode is optional; if added, keep the lime accent.
- Fonts: Bricolage Grotesque (800 for headings), Figtree for body.
- Bottom nav with 3 tabs: Week, Recipes, Shopping.
- Big touch targets. Rounded cards, rounded pill buttons, no clutter.
- A tappable design mockup exists in the earlier chat (dinner-planner-preview-v2.html). Follow that layout as closely as possible.

## Screens
1. **Week** (home). Header "This week", Monday-first through Sunday-last, showing the date range. A segmented toggle at the top: "Recipes | Shopping list (n)". Buttons: "Shuffle all" and "Shuffle unlocked". Each day is a card with photo, dinner name, cuisine, time, a servings stepper (default 2), a lock button, and a swap button. Tapping an empty day lets us choose from the recipe book (search and cuisine filters) or tap a dice button to randomise only that day. Nights can be marked "Takeaway / eating out": no recipe, nothing added to the shopping list. Past days fade out but stay visible. Optional "Smart suggestions" section: recipes that share ingredients with this week's plan.
2. **Shopping list**. Auto-built from the week's dinners, grouped by aisle (Fruit & veg, Meat & fish, Dairy, Tins & dry, Spices, Frozen, Bakery, Other). Merge duplicate ingredients across recipes and add up quantities (with sensible unit handling); show which meals each item is for. Tick items off in store; ticks sync live between phones. A text box at the top to add our own extras (milk, bin bags), tagged EXTRA and kept separate from recipe items. Swapping a dinner updates the list. Ticked items move to the bottom or grey out.
3. **Recipe page**. Photo, name, cuisine, time, difficulty, favourite star, servings stepper (scales ingredient quantities), ingredients with quantities, then the full **Method as a numbered list underneath**. Also a "Start cooking" button.
4. **Cook mode**. Step-by-step, one step at a time, big text, progress bar, Back/Next, shows the ingredients needed for that step, keeps the screen awake (Screen Wake Lock API).
5. **Recipe book**. Search by name or ingredient; filter by cuisine, type and favourites. Add / edit / delete recipes. Ingredient list needs: name, quantity, unit, aisle. Method steps. Photo (camera or gallery, compressed client-side before upload). Cuisine and category fields.
6. **Past weeks**. Each finished week is saved. Can view or repeat a past week.

## Recipe data
- **Cuisines**: pre-seed Indian, Mexican, Italian, Japanese/Sushi, Meat dishes, Pasta, Chinese, Thai, Pub classics, Other. We must be able to add our own cuisines.
- **Recipe types**: Dinner (default), Dessert, Side. Types can be added too.
- **Desserts**: each day has an optional extra "Dessert" slot. Dessert ingredients also go on the shopping list. Randomise only picks dinners for the main slot.
- **Macros**: per-serving calories, protein, carbs and fat per recipe (manual entry). Show calories and protein on dinner cards, plus a weekly average. Optional per-dinner protein/calorie targets, and a filter for "high protein" and "under X calories". Only dinners (and desserts) are tracked, not other meals.
- **Starter set**: pre-load about 30-40 common dinners across the cuisines above with real ingredients and steps, so the app is usable on day one. Mark them as editable starter recipes.

## Randomiser rules
- Pick only Dinner-type recipes.
- No repeats within the same week.
- Never the same cuisine on two neighbouring nights.
- Avoid recipes cooked in the previous 2-3 weeks; favourites are slightly more likely.
- Respect locked days and takeaway nights; only fill unlocked, empty or shuffled days.
- Cover any number of nights up to 7 per week. Default 7 nights, 2 people.

## Weeks and "New week"
- The week is Monday to Sunday. Shop day is a setting (default Sunday).
- "New week" button (with a confirm: "Start a new week? This clears the current dinners and shopping list."). It saves the old week to Past weeks, clears dinners and the list, and carries over any unticked EXTRA items (ask, with carry-over as the default). Recipes are never deleted by this.

## Sync between two phones
- Both phones open the same link and share one household's data. Use a free hosted database with realtime updates (recommended: Supabase, free tier; Firebase Firestore is acceptable). A change on one phone appears on the other within seconds (plan, swaps, shopping ticks, recipes, photos).
- Simple access: a shared "household code" or shared login that we both enter once and the phone remembers. No complicated sign-up. Make sure the data isn't readable by strangers (use row-level security or equivalent tied to the household).
- Store photos in the database's file storage (compress to about 1000px wide first).
- Offline: the app must open and show the last-known plan, recipes and shopping list with no signal, allow ticking items, and sync when back online.

## Hosting
- Static files served by GitHub Pages from this repo (set up the Pages workflow / settings yourself if you can; otherwise tell me the exact taps).
- No build step that I have to run. Plain HTML/CSS/JS or a small framework built by a GitHub Action is fine.
- Repo must contain a clear README.md with, in plain language: how to create the free Supabase (or Firebase) project, where to paste the keys, how to open the link, and how to add it to the home screen on iPhone and Android.
- Don't put secrets in the repo. The public anon/publishable database key is OK for a client app when the security rules are set correctly. Write the SQL/rules file that sets up the tables and security, and tell me exactly where to paste it.

## Not in the first version (keep the design ready for later)
- AI features (paste recipe text or a photo to create a recipe, estimate macros from ingredients). These would need an API key and a small backend, so leave them out now, but structure the recipe form so they could be added later.
- Importing recipes from a link. It's not reliable from the browser, so skip it.
- User accounts beyond the shared household login, recipe sharing with other people.

## Quality bar
- Test it in a browser (mobile viewport) before you tell me it's done: week plan, randomise, swap, lock, takeaway night, shopping list merge/aisles/tick/extras, recipe scaling, cook mode, new week, add recipe with photo, installability.
- Commit in clear steps. When finished, give me: the live link, and a short numbered checklist of what I need to do once (create the database project, paste the keys, add to home screen on both phones).
