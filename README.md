# OpenFit

A self-hosted, subscription-free fitness PWA for your iPhone. It combines:

- **Workout logging** (openGym-style): exercises, sets, reps, weight, RPE and notes
- **Body-weight tracking** with a trend chart
- **Nutrition logging** (OpenNutriTracker-style): calories and macros, with a **camera barcode scanner**
  backed by the free Open Food Facts API
- **A local AI coach** running on your own PC through **Ollama**, which reads your last 7 days of data
- **A desktop app for Windows and Mac** (`desktop/`): a big-screen dashboard with progress charts
  for weight, food and training, and AI coach progress reports ([SETUP.md](SETUP.md#desktop-app-windows-and-mac-your-progress-on-a-big-screen))

All data lives in a SQLite file on your PC. **→ See [SETUP.md](SETUP.md) to get it running on your phone.**

## Launcher (Windows)

**New PC?** Double-click **`Setup.cmd`**: it installs Node.js, Ollama and the coach model,
creates your settings and passcode, HTTPS certificates and a Desktop shortcut, and skips
anything already done (see [SETUP.md](SETUP.md#quick-start-one-click)).

Double-click **OpenFit** (the green dumbbell icon) in the project folder. It runs the
setup on first run, checks the database, starts Ollama if needed, rebuilds only
when the code changed, starts the server (HTTPS if `certs/` exists), opens your browser
and prints the address to use on your iPhone. Close the window to stop OpenFit.

- No shortcut yet, or moved the folder? `npm run make:shortcut` (add `-- -Desktop` or
  `-- -StartMenu` to also put one there). `OpenFit.cmd` does the same without the icon.
- Start silently at log-on: Task Scheduler → run `launcher\launch.ps1 -NoBrowser`.
- Icon source: `scripts/make-icon.mjs` renders `launcher/openfit.ico` from the same
  design as the iPhone icon (`npm run make:icon`).

## Configuration

Most settings live in the app (**Settings**, gear icon on Today). The rest are in `.env`, which
Setup creates from [`.env.example`](.env.example). A value set in the app wins over `.env`.

| What | Where | Default | Notes |
|---|---|---|---|
| AI model | Settings → AI coach connection, or `OLLAMA_MODEL` | `gemma4:latest` | Any chat model from [ollama.com/library](https://ollama.com/library). The field suggests installed models; download a new one from Settings → Setup. |
| Thinking level | Settings → AI coach connection, or `OLLAMA_REASONING_EFFORT` | `none` | `low` is smarter for a few seconds' pause on a fast GPU. Only affects thinking models. |
| Ollama address | Settings → AI coach connection, or `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Change only if Ollama runs on another machine. |
| Passcode | `APP_PASSCODE` (Setup asks for it) | none | Strongly recommended. Changing it signs every device out. |
| Extra hostnames | `ALLOWED_HOSTS` | none | Only for names or forwarded addresses the PC can't see itself. Its own IPs, `localhost`, `*.local` and Tailscale names always work. |
| Your PC's IP | nothing to set | detected | The launcher prints the phone address, Settings → Setup lists it, and the HTTPS certificate is refreshed automatically when it changes. |
| Goals, units, body profile, fat-loss pace | Settings | 2,000 kcal, kg | The calorie target card can fill your goals in for you. |
| Week starts on | `WEEK_START` in `src/lib/dates.ts` | Sunday (`0`) | `1` for Monday. |
| Port | `PORT` environment variable | 3443 (HTTPS), 3000 (HTTP) | |

## License

MIT, see [LICENSE](LICENSE). The exercise photos are public domain (see Credits).

## Credits

Exercise demonstration photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) by yuhonas,
released into the public domain (Unlicense). Stored in `public/exercises/`; the name mapping is in
`src/lib/exercise-media.ts`.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · lucide-react · Prisma 6 + SQLite ·
`@ducanh2912/next-pwa` (the maintained, App Router–compatible fork of `next-pwa`) ·
`@zxing/browser` · zod

## Folder layout

Layered and modular: **UI components** render, **hooks** hold client state, **services** make
browser-side API calls, **actions** validate and write, **lib** holds business logic and data access.
One responsibility per file.

```
openfit/
├─ prisma/                         # schema.prisma, migrations, seed.mjs
├─ server.mjs                      # production HTTPS server (iOS camera needs HTTPS)
├─ src/
│  ├─ app/                         # routes only: pages, layouts, API route handlers
│  │  ├─ page.tsx                  #   Today (composes components/today)
│  │  ├─ workouts/ · weight/ · nutrition/ · coach/ · settings/ · login/ · offline/
│  │  └─ api/                      #   coach (stream, note, health, checkup, selftest),
│  │                               #   food/barcode/[code], login, export
│  ├─ actions/                     # server actions, one file per domain (all writes)
│  │  ├─ food.ts · weight.ts · workouts.ts · settings.ts
│  │  └─ schemas.ts · settings-form.ts · revalidate.ts
│  ├─ services/                    # browser → API calls; components never call fetch()
│  │  ├─ http.ts · streams.ts · types.ts
│  │  └─ auth · coach · coach-note · diagnostics · food · connectivity (.service.ts)
│  ├─ components/
│  │  ├─ workout/                  # WorkoutLogger + useWorkoutLogger, RestTimer, PlanChecklist, …
│  │  ├─ scanner/                  # BarcodeScanner + useLiveScanner, CameraView, PhotoCapture, …
│  │  ├─ food/                     # FoodEntryForm, PortionFields, ManualFoodFields, …
│  │  ├─ coach/                    # CoachChat + useCoachChat, MessageList, CoachNote, …
│  │  │  └─ diagnostics/           #   checkup + self-test screens and hooks
│  │  ├─ today/ · settings/        # sections of those two screens
│  │  └─ shared: PageHeader, BottomNav, MacroBar, WeightChart (pure SVG), ExerciseDemo, …
│  └─ lib/
│     ├─ ollama/                   # Ollama connector: config, errors, chat (SSE), health, lock
│     │  └─ checkup/checks/        #   one file per checkup check
│     ├─ coach/                    # system prompt, messages, safety flags
│     │  ├─ sections/              #   one file per data-block section (training, nutrition, …)
│     │  └─ selftest/              #   fixtures, rules, cases, runner
│     ├─ energy.ts · energy-data.ts · progression.ts · workout-plan.ts · food-entry.ts
│     ├─ openfoodfacts.ts · barcode-reader.ts · exercises.ts · today-data.ts
│     └─ db · settings · auth · dates · units · format · storage · ui · programs · nutrition
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on `0.0.0.0:3000` (HTTP) |
| `npm run dev:https` | Dev server over HTTPS using `certs/` (mkcert) |
| `npm run build` then `npm run start:https` | Production over HTTPS on port 3443 |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma helpers |
| `npm run typecheck` | `tsc --noEmit` |

## Design notes

- **The phone never talks to Ollama directly.** `/api/coach` proxies the request, so there are no
  CORS or mixed-content problems, and the Ollama URL can stay `127.0.0.1`.
- **Coach errors are reported before the stream starts.** The route reads the first token before it
  sends a response, so "Ollama down" or "model missing" arrive as a JSON error with a fix-it hint
  instead of a half-open stream.
- **Weights are stored in kg** and converted for display, so switching between kg and lb is lossless.
- **Days are stored as local `YYYY-MM-DD` strings**, which avoids timezone bugs in "today" queries.
- **Coach averages exclude today**, because a half-logged day would make it look like you're under-eating.
