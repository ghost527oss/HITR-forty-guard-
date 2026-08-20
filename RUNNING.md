# Running HITR on your own machine

Two terminal windows. First-time users follow "Setup" once, then "Run" every time.

> **Which commands?** Use the block for your operating system.
> - **Windows:** `python`, `.venv\Scripts\activate`
> - **Mac / Linux:** `python3`, `source .venv/bin/activate`

## Requirements
- Python 3.10+ installed
- Node.js 18+ and npm installed

> **Windows note:** if `python --version` opens the Microsoft Store or hangs, the Store stub is
> installed instead of real Python. Uninstall "Python" from Settings → Apps, install from
> **python.org** (tick "Add to PATH"), restart the terminal, then continue.

## Setup (one time)
### Windows
```powershell
git clone https://github.com/ghost527oss/HITR-forty-guard-.git
cd HITR-forty-guard-

cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..

cd frontend
npm install
cd ..
```

### Mac / Linux
```bash
git clone https://github.com/ghost527oss/HITR-forty-guard-.git
cd HITR-forty-guard-

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..

cd frontend
npm install
cd ..
```

## Run (every time)
**Terminal 1 — backend (port 8000):**
```powershell
cd backend
.venv\Scripts\activate          # Windows
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
```bash
cd backend
source .venv/bin/activate       # Mac / Linux
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — frontend (port 5173):**
```powershell
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

## Troubleshooting
- **`python -m venv .venv` hangs / opens the Store** → install real Python from python.org (see above).
- **`.venv\Scripts\activate` "command not found"** → the venv did not get created (check the `backend`
  folder for a `.venv` folder). Re-run `python -m venv .venv` first.
- **`uvicorn` not found** → the venv wasn't activated (no `(.venv)` in your prompt). Re-run the activate
  line.
- **Nothing shows at localhost** → make sure both terminals are running at the same time.

## Using your FortyGuard API key (optional, for real temperatures)
You do NOT need to send me the key. You keep it secret and put it only in a local file:

```bash
cd backend
cp .env.example .env      # then open .env with any editor
```
In `.env`, set:
```
FORTYGUARD_API_KEY=your_key_here
HEAT_PROVIDER=real
```
`.env` is git-ignored, so your key never goes to GitHub and never appears in this chat.
With no key set, the app runs on realistic sample ("mock") temperatures so you can develop freely.

## Connecting your Supabase knowledge database (optional — makes the AI read your data)
The AI assistant works out of the box on the bundled knowledge seed. To have it read from **your**
Supabase project instead:

1. **Create the tables + load the starter data** in Supabase:
   - Open your project at https://supabase.com → **SQL Editor**.
   - Paste and run `db/schema.sql`.
   - Then run the seed files in order: `db/seed/01_cities_health.sql`, `02_emergency.sql`,
     `03_encyclopedia.sql`, `04_buildings.sql`. (You can also just add your own rows directly.)
2. **Get your project URL + publishable (anon) key** from **Settings → API**.
3. **Put them in `backend/.env`**:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your_anon_key
   ```
   (No need to "connect GitHub to Supabase" — they are separate.)
4. Restart the backend. The assistant now reads from Supabase. If Supabase is unreachable, it
   automatically falls back to the bundled seed so the app never breaks.

> Tip: to add more knowledge later, just insert rows into the tables (or edit the seed SQL). The
> assistant and UI pick them up automatically — you don't have to change any code.

## Changing/undoing code
Every change is a Git commit, so you can always go back:
```bash
git log --oneline          # see versions
git checkout <hash> -- <file>   # restore a specific file from an old version
```
