# TunaiPintar

TunaiPintar is an assignment prototype for an AI-powered treasury robo-advisor aimed at Malaysian SMEs. It illustrates how a business could combine accounting and banking context to forecast obligations, protect a minimum cash reserve, and identify genuinely surplus cash for a proposed investment sweep.

The prototype is an educational business-idea showcase. It does not provide financial advice, real authentication, bank connectivity, forecasting AI, or investment execution.

## Business value demonstrated

- **Problem:** SMEs may leave substantial cash idle because they cannot confidently distinguish temporary balances from funds needed for payroll, suppliers, tax, and daily operations.
- **Target customers:** Malaysian SME owners, finance managers, and lean finance teams without a dedicated treasury function.
- **Value proposition:** estimate safe-to-invest cash only after considering upcoming obligations and a user-selected liquidity reserve.
- **Customer benefits:** better cash visibility, less manual treasury work, preserved operating liquidity, and a transparent review step before any simulated sweep.

## Technologies

- Python 3 and Flask
- Supabase Python client with a read-only seeded demo snapshot
- HTML5
- CSS3
- Vanilla JavaScript
- Local JSON demo data as the default and automatic fallback
- Inline SVG charts generated in the browser

The current prototype uses fictional demonstration data to illustrate the
dashboard functions and treasury management processes. Supabase has been
connected as a seeded data environment containing a read-only copy of this
dataset, while local JSON remains the default source and automatic fallback.
This connection does not make the prototype a real financial system. There is
no frontend framework, charting package, real authentication, bank connection,
or real financial integration. One Flask server serves both the frontend and
API.

The seeded Supabase record represents the fictional **Advanced Engineering
Supplies Sdn. Bhd.** workspace. In future development, Supabase Auth would
identify each customer, relational tables would record business-specific
financial information, and Row Level Security would ensure that each SME can
access only its own data. This multi-customer storage and access model is not
implemented in the current prototype.

## Project structure

```text
project/
├── .env.example
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── assets/
│       └── favicon.svg
├── backend/
│   ├── app.py
│   ├── data_provider.py
│   └── demo_data.json
├── scripts/
│   └── seed_supabase.py
├── requirements.txt
├── plan.txt
└── README.md
```

## Installation

Python 3.9 or newer is recommended.

From the `project` directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Copy the environment template before configuring Supabase:

```bash
cp .env.example .env
```

On Windows PowerShell, activate the environment with:

```powershell
.venv\Scripts\Activate.ps1
```

## Start the prototype

With the virtual environment active, run:

```bash
python backend/app.py
```

Then open [http://127.0.0.1:5000](http://127.0.0.1:5000) in a browser.

Use any validly formatted email address and any non-empty password. Choose either Shariah or Conventional to change the fictional fund example. This is only a simulated login; it does not create an account or provide real security.

Stop the development server with `Ctrl+C`.

## Seeded Supabase demo environment

The app uses `backend/demo_data.json` by default to provide reliable fictional
data for the demonstration. The connected Supabase environment stores a
read-only seeded copy of the same dataset in the `demo_snapshots` table. Setting
`DATA_SOURCE=supabase` instructs the Flask backend to retrieve this hosted copy.
If the Supabase request fails, Flask logs the error and returns the local JSON
automatically.

This single snapshot is intentionally simple for the assignment demo. A future
customer-ready version should replace it with separate tables for businesses,
profiles, cash accounts, cash-flow entries, investments, treasury settings and
automation approvals, all linked by business ID and protected with Row Level
Security.

After creating the table and Row Level Security policy, open the Supabase
project's **Connect** dialog to copy the project URL and publishable key. All
keys can also be found under **Settings > API Keys**. Put the values in `.env`:

```text
DATA_SOURCE=json
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_SECRET_KEY=sb_secret_your_key
SUPABASE_DEMO_SLUG=nusantara-supply
```

The publishable key is used by the running Flask app and remains restricted by
the table's Row Level Security policy. The secret key bypasses Row Level
Security and is used only to seed the fictional dataset locally. Never expose
the secret key in frontend code, commit `.env`, or add the secret key to Render.

Seed or refresh the hosted snapshot:

```bash
python scripts/seed_supabase.py
```

After that succeeds, change `DATA_SOURCE` in `.env` to `supabase`, restart
Flask, and reload the app. You can remove `SUPABASE_SECRET_KEY` from `.env`
after seeding. To confirm the source, inspect the `/api/dashboard` response
header:

```bash
curl -I http://127.0.0.1:5000/api/dashboard
```

It reports `X-Demo-Data-Source: supabase`, `json`, or `json-fallback`.

## Deploy to Render

This repository includes a `render.yaml` Blueprint for deployment as one Render
web service. Flask serves both the frontend and the dashboard API, so a separate
static-site service is not required.

1. Push this `project` directory to a GitHub or GitLab repository.
2. In Render, choose **New > Blueprint** and connect the repository.
3. Review the detected `tunaipintar` web service and apply the Blueprint.
4. After deployment, open the generated `onrender.com` URL. Render checks
   `/health` before directing traffic to a new deployment.

The Blueprint installs the dependencies from `requirements.txt` and starts the
app with Gunicorn on Render's assigned `PORT`. Python 3.13 is selected through
`.python-version`. The service works without environment variables by using
the local JSON dataset.

To use Supabase on Render, add only these environment variables to the web
service:

```text
DATA_SOURCE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
SUPABASE_DEMO_SLUG=nusantara-supply
```

Do not add `SUPABASE_SECRET_KEY` to Render.

The same settings can be entered manually by creating a Python web service with
the following values:

```text
Build command: pip install -r requirements.txt
Start command: gunicorn backend.app:app --bind 0.0.0.0:$PORT
Health check path: /health
```

## Available routes

- `GET /` — frontend application
- `GET /api/dashboard` — fictional dashboard data from JSON or Supabase
- `GET /health` — service status and configured data source
- `/style.css`, `/script.js`, and `/assets/...` — frontend resources

The seven workspace destinations use URL hashes such as `#cash-flow` and `#investments`. They are distinct views inside the same browser application and remain served by the single Flask server.

## Features and interactions

- Demo login with email-format validation, loading feedback, and compliance preference
- Authenticated-looking responsive dashboard with four cash metrics
- Historical and simulated forecast cash-flow chart
- 30-, 60-, and 90-day forecast controls
- Upcoming payment schedule
- Fictional Shariah and conventional money market fund examples
- Proposed cash sweep with review, acknowledgement, cancel, and confirmation states
- Searchable and filterable transaction ledger
- Monthly report tabs and browser-generated text report
- Simulated bank and accounting integration actions
- Editable minimum reserve with validation and recalculated surplus/sweep figures
- Notification preference controls
- Desktop sidebar and mobile navigation drawer
- Loading, no-results, validation, success, and API failure states
- Logout returning to the demo login

## Data and system logic

All canonical demo values are stored in `backend/demo_data.json`. The seed
script copies the complete object to the Supabase `demo_snapshots.payload`
column. Flask reads the configured provider for each `GET /api/dashboard`
request, while JavaScript receives the same response structure in either mode.

The primary prototype calculation is:

```text
current available surplus = total business cash - selected minimum reserve
forecast-safe surplus = lowest forecast cash - selected minimum reserve
proposed sweep = lower of the original demo proposal or forecast-safe surplus
forecast liquidity remaining = lowest forecast cash - proposed sweep
```

Changing settings, confirming a sweep, connecting an integration, or choosing notification preferences only changes in-memory browser state. The JSON file is not edited, so refreshing returns to its starting values.

## Demo limitations and disclaimer

- All company names, accounts, balances, invoices, payments, funds, returns, forecasts, reports, and AI insights are fictional.
- The login uses `sessionStorage` as a display convenience. It is not authentication and should never be used for a real system.
- No password is sent to or stored by the Flask backend.
- Supabase is currently a seeded demonstration environment containing one
  read-only fictional dataset; it does not yet record individual customer data
  or provide server-side user persistence.
- There is no connection to a bank, accounting platform, payment rail, fund manager, or licensed investment provider.
- No money is moved, and no investment order is created or redeemed.
- The “AI” insight and forecast are prepared demo data, not the output of a trained production model.
- Forecasts can be wrong. Money market funds are not bank deposits and are not risk-free.
- Indicative returns may change, are not guaranteed, and are not financial advice.
- The prototype is not production-ready and has not undergone security, regulatory, model-risk, or accessibility certification.

## Testing performed

Testing was performed on 4 October 2026 using macOS, Python 3.13, Flask 3.1.3, command-line HTTP checks, and the Codex in-app Chromium browser.

### Server and data checks

| Check | Actual result |
|---|---|
| Python source parse | Passed |
| `backend/demo_data.json` parse | Passed as valid JSON |
| `GET /` | HTTP 200, `text/html` |
| `GET /api/dashboard` | HTTP 200, `application/json` |
| API JSON parse | Passed; required dashboard groups were returned |
| `GET /health` | HTTP 200, `application/json` |
| CSS, JavaScript, and favicon requests | Loaded successfully during browser testing |

### Browser interaction checks

| Check | Actual result |
|---|---|
| Empty login submission | Passed; both helpful field messages appeared |
| Non-empty login | Passed; dashboard loaded from the Flask API |
| Shariah/Non-Shariah choice | Passed; Non-Shariah showed the fictional conventional fund example |
| All seven sidebar destinations | Passed; each distinct view loaded and updated its title/active state |
| Cash-flow range | Passed; 90-day control became active and five payment records rendered |
| Sweep review | Passed; confirmation was blocked until the simulation acknowledgement was selected |
| Sweep confirmation | Passed; UI changed to “Simulation confirmed” and explicitly stated no funds moved |
| Transaction filters | Passed; Outflow returned four records, unmatched search showed the no-results state, and Clear restored results |
| Report month tabs | Passed; September figures and interpretation replaced October figures |
| Integration simulator | Passed; fictional Xero status changed from Available to Connected locally |
| Reserve validation | Passed; RM49,000 was rejected and RM250,000 was accepted during the session |
| Notification controls | Passed; weekly-summary selection updated locally |
| API failure handling | Passed; stopping the server produced a visible explanation and Try again control rather than an empty dashboard |
| Browser console | Passed; no warning or error entries after the primary interaction suite |
| Logout | Passed; returned to login and cleared the password field |

### Responsive checks

| Viewport | Actual result |
|---|---|
| 1440 × 1000 desktop | Two-column login, persistent sidebar, KPI grid, chart, insight, and content cards rendered without overlap |
| 390 × 844 mobile | Mobile header and drawer rendered; cards stacked/reflowed; measured page width and scroll width were both 390 px, so there was no unintended horizontal page overflow |

The responsive charts intentionally allow local horizontal scrolling inside the chart container on narrow screens so labels remain readable without making the entire page overflow.

## AI assistance disclosure

OpenAI Codex assisted with:

- interpreting the business brief and turning it into the staged plan in `plan.txt`;
- drafting the fictional demo dataset and checking that figures are internally consistent;
- generating the initial Flask, HTML, CSS, and JavaScript implementation;
- running HTTP and browser-based functional checks;
- identifying and correcting presentation and interaction issues found during testing; and
- drafting this README and recording the actual tests performed.

The project owner should review the source, calculations, wording, test record, and assignment requirements before submission. AI assistance does not replace that review or make the prototype suitable for real financial use.

## Troubleshooting

- **`ModuleNotFoundError: No module named 'flask'`** — activate the virtual environment and run `python -m pip install -r requirements.txt`.
- **Port 5000 is already in use** — stop the other process or run `python -m flask --app backend.app run --port 5001`.
- **“We could not load the demo data”** — confirm the Flask server is running and validate `backend/demo_data.json` as JSON.
- **Supabase silently falls back to JSON** — check the Flask log, confirm `DATA_SOURCE=supabase`, verify the project URL and publishable key, and confirm the seeded row uses the expected slug.
- **Settings reset after refresh** — this is expected. Prototype changes are intentionally browser-only and temporary.
