# Changelog

All notable changes to OpenFit. Versions follow [Semantic Versioning](https://semver.org).

## [0.1.3] - 2026-10-19

### Added

- **Setup offers Pro training.** A new Setup step asks whether to switch on the Pro training module (and
  downloads its exercise library). Older installs are asked once on their next launch; the answer is
  saved as `PRO_TRAINING_OFFERED` in `.env`, so you're never asked twice. Scripted:
  `node scripts/module.mjs status|enable|disable training-pro`.
- **Supersets** (Pro training): tick "Superset with the next exercise" in your program; the logger goes
  back and forth between them and starts the rest timer only after the round.
- **Log food from the coach chat**: messages that describe a meal ("I had 2 eggs and toast") and coach
  replies that suggest one with numbers get a link that opens AI food logging with the text filled in.

### Changed

- **Smarter exercise search** (Pro training): exercises you've logged and gym staples come first, then
  names that contain every word, with stretches and cardio last. Common gym names work too: "back squat",
  "OHP", "RDL", "pull-ups", "skull crushers".

## [0.1.2] - 2026-10-19

### Added

- **Logging works with no signal.** Food, sets and weigh-ins are saved on the phone first and sent to
  the PC in the background (`/api/log`), so a dead zone or a sleeping PC never loses an entry. Each entry
  carries its own id, so a retry can't save it twice; a pill above the tab bar shows what's waiting, and
  anything the PC refuses (say, a set for a deleted workout) can be retried or discarded.
- **AI food logging.** Snap your plate and/or describe it ("2 eggs, toast with butter and a latte"): the
  local model lists the foods with portions and macros, you adjust and add them in one tap. Numbers from
  your own log or a scanned product beat the model's guess; a description that names a food you've logged
  uses that entry. Nothing leaves your PC.
- **Modules**: optional extras in Settings → Modules, each self-contained in `src/modules/<id>/`. The first:
  **Pro training**, with the 870-exercise free-exercise-db library (downloaded when switched on; photos
  cached as you view them), personal-record alerts (also offline), a plate and warm-up calculator, warm-up
  and drop sets (warm-ups don't count for records or progression), and your own programs.
- **Import** from MyFitnessPal (meal totals), Strong and Hevy (workouts), or an OpenFit backup, with a
  preview and duplicate skipping (Settings → Import).
- **Apple Health** through an iPhone Shortcut and a revocable device token (Settings → Apple Health):
  weight, steps and active calories arrive by themselves; the coach sees your activity.
- Unit tests (`npm test`, Vitest) for the offline queue, imports, AI estimates and plate maths.

- **Choose your remote access.** Use OpenFit away from home over Tailscale (or Headscale), WireGuard,
  ZeroTier, NetBird, or any other VPN (OpenVPN, Nebula, a router VPN...) by entering its address.
  Pick it when Setup asks, in Settings → Remote access, or with `REMOTE_ACCESS` in `.env`. Setup
  installs the chosen app, the HTTPS certificate covers its address, the launcher and Settings show
  the "Anywhere" address, and the address is accepted by the host check. Existing installs keep
  using Tailscale.

## [0.1.1] - 2026-10-19

### Added

- **Desktop app for Windows and macOS** (`desktop/`). A big-screen dashboard with charts for body weight,
  calories by macro, protein, weekly training volume and the progression of your main lifts, from 7 days
  to a year. It runs OpenFit's own server on a private localhost port, so it reads the same database as
  the phone. Windows installer attached to the release; build the macOS `.dmg` with `npm run dist:mac`.
- **Coach progress reports.** The desktop dashboard asks the local AI coach for a written review of the
  selected period (Summary, What the data shows, Next 7 days, Coach's tip). Reports are saved.
- **Validator** (`Validate.cmd`, `npm run validate`). Checks the install and repairs what's out of step:
  missing files, script line endings, `.env` problems, Node.js, packages, database client and migrations,
  build, HTTPS certificates and shortcuts. `-CheckOnly` only reports.
- Settings: first day of the week, imperial height, and your own standing instructions for the coach.

### Fixed

- **HTTPS setup on Windows PowerShell 5.1.** Certificate creation stopped at OpenSSL's first progress line,
  so PCs without PowerShell 7 never got HTTPS (and so no live barcode scanning on the iPhone).
- HTTPS certificates are now checked on every start and re-issued when they're about to expire, when the
  key doesn't match the certificate, or when the PC's address changes. A failed run no longer leaves a
  mismatched key behind.
- **Login brute-force limit could be bypassed** by sending a different `X-Forwarded-For` header with each
  guess (which could also lock your own phone out). The HTTPS server now uses the real connection address.
- Adding food: tapping a recent food added it to the meal picked by the time of day, not the meal you
  selected in the form.
- Weight: "You've reached your goal weight" showed 0.1 kg early (floating-point rounding); passing your goal
  now says so instead of "x kg to your goal".
- Food fields are now properly labelled for VoiceOver.
- The Home Screen app's splash and status bar colour now match the app.
- Setup skips anything already installed (also when it isn't on PATH yet), requires Node.js 20.12+, and
  finds Ollama from its command-line tool too. `Setup.cmd` / `OpenFit.cmd` no longer run a second time in
  Windows PowerShell after an error in PowerShell 7.
- The server trusts the local certificate authority even when `NODE_EXTRA_CA_CERTS` is already set.

## [0.1.0] - 2026-10-18

First release: workout logging with ready-made programs, nutrition logging with a camera barcode scanner,
body-weight tracking, a local AI coach through Ollama, passcode lock, HTTPS and the one-click Windows setup.

[0.1.2]: https://github.com/Vitzso/open-fit/releases/tag/v0.1.2
[0.1.1]: https://github.com/Vitzso/open-fit/releases/tag/v0.1.1
[0.1.0]: https://github.com/Vitzso/open-fit/commit/50a2b9f
