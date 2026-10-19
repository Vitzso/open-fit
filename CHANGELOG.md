# Changelog

All notable changes to OpenFit. Versions follow [Semantic Versioning](https://semver.org).

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

[0.1.1]: https://github.com/Vitzso/open-fit/releases/tag/v0.1.1
[0.1.0]: https://github.com/Vitzso/open-fit/commit/50a2b9f
