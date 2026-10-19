# OpenFit setup guide (Windows PC + iPhone)

## Quick start: one click

**Easiest:** install the desktop app (`OpenFit-Setup-x.y.z.exe` from the
[latest release](https://github.com/Vitzso/open-fit/releases)). The installer asks where to put
the app (keep the folder it shows to update an earlier install; don't pick your OpenFit data
folder, the app finds that itself). When the app first opens:

- **OpenFit already on this PC** (found from its shortcuts): use it, and update it if this app
  has a newer version. Your data, settings and passcode are kept.
- **No OpenFit yet:** install it (in your user folder, or one you choose). Tick **Add Pro training**
  if you want the exercise library, personal records and the rest of the module.

Setup then opens in its own window for the steps below and shows your dashboard when it's done.
After that, the **OpenFit** app is all you start: it runs the server your phone uses, and closing its
window keeps it running in the tray (right-click the tray icon for your phone's addresses, **Start with
Windows** and **Quit**).

**Or by hand:** double-click **`Setup.cmd`** in the OpenFit folder. It installs whatever is missing and
skips whatever is already done, so it's also the "repair" button. Its questions all come first;
after that it runs by itself:

1. Node.js (via winget, Windows' built-in installer)
2. Git for Windows, for the OpenSSL that makes HTTPS certificates
3. Your settings file (`.env`): choose a passcode (typed hidden), and whether to add Pro training
4. Remote access, if you want it (for using OpenFit away from home): Tailscale, WireGuard,
   ZeroTier, NetBird or your own VPN, see [Away from home](#away-from-home-tailscale-wireguard-zerotier-netbird-or-your-own)
5. Ollama and the coach model (`gemma4:latest`, several GB the first time). The model downloads
   in the background while the next steps run.
6. App packages, database and build (the installer's copy of OpenFit comes prebuilt, so the build
   is skipped)
7. Pro training, if you said yes
8. HTTPS certificates
9. The OpenFit shortcut on your Desktop

Something acting up (the app won't start, HTTPS stopped working, you moved the folder)?
Double-click **`Validate.cmd`** (or run `npm run validate`). It checks that the settings file,
packages, database, build, certificates and shortcuts all agree with each other and fixes
whatever doesn't. Add `-CheckOnly` (`pwsh -File launcher\validate.ps1 -CheckOnly`) to only report.

The **OpenFit** shortcut runs this setup automatically the first time, so on a new PC
one double-click is enough. In the app, **Settings → Setup** shows what's ready and can
download the coach model with one tap.

The steps below explain each part, for manual setup or troubleshooting.

How it fits together:

```
iPhone Safari / Home Screen app
        │  https://<pc-ip>:3443   (home Wi-Fi, or anywhere via Tailscale, WireGuard, ZeroTier, NetBird…)
        ▼
Next.js server on your PC ──► SQLite file  prisma/openfit.db
        │            └──────► Open Food Facts API (internet, product lookups only)
        ▼
Ollama on your PC  http://127.0.0.1:11434/v1/chat/completions
```

The iPhone only ever talks to the Next.js server. The server calls Ollama on the
phone's behalf, so Safari never runs into CORS or mixed-content blocking.

> **`<pc-ip>`** below means your PC's address on your network, e.g. `192.168.1.20`. You don't
> need to look it up: the launcher window prints it when OpenFit starts, and **Settings → Setup**
> in the app lists every address to use. If it changes (new router, other network), the launcher
> updates the HTTPS certificate by itself, so nothing needs redoing on the phone.

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.9 or newer | https://nodejs.org |
| Ollama | latest | https://ollama.com/download/windows |
| Git for Windows (only for HTTPS, step 6; provides OpenSSL) | latest | https://git-scm.com |

Keep the project in a **short path**, like `C:\dev\openfit`. Windows' 260-character
path limit can stop Prisma's engine from starting (`spawn ... schema-engine-windows.exe ENOENT`).

## 2. Install the app

```powershell
cd C:\dev\openfit
npm install                 # also runs `prisma generate`
copy .env.example .env      # skip this if .env already exists
npx prisma migrate deploy   # creates prisma/openfit.db from prisma/migrations
npm run db:seed             # default settings + 18 common exercises
```

**Set a passcode (recommended).** The server listens on your whole Wi-Fi, so
without one, anyone on the network can open OpenFit. In `.env`:

```
APP_PASSCODE="pick-something-only-you-know"
```

Restart the server. Each device asks for the passcode once and then stays
signed in for a year. Changing the passcode signs every device out. Five wrong
guesses lock that device out for 10 minutes. The Home Screen app keeps its own
cookies separate from Safari, so you sign in once in each.

If you reach the PC by a hostname instead of its IP (for example `my-pc.lan`), or by an
address the PC can't see itself (a port forward, a reverse proxy), add it to `ALLOWED_HOSTS`
in `.env` (comma-separated). Unknown hostnames are rejected to stop DNS-rebinding attacks;
IP addresses, `localhost`, `*.local`, Tailscale and NetBird names and `REMOTE_ADDRESS` always work. Entries are also added
to the HTTPS certificate the next time it's made.

To change the schema later, edit `prisma/schema.prisma` and run `npm run db:migrate`.
To browse your data, run `npm run db:studio`.

## 3. Set up Ollama (private to this PC)

### 3a. Pick a model

```powershell
ollama list                 # what you already have
ollama pull gemma4:latest   # the default; llama3.1:8b, qwen3:8b, mistral:7b… also work
```

Choose it on the app's **Settings → AI coach connection** page (the field suggests models you
have installed), or set `OLLAMA_MODEL` in `.env`. A model you pick that isn't downloaded yet
can be downloaded from **Settings → Setup** with one tap.
For "thinking" models (gemma4, qwen3, deepseek-r1), `OLLAMA_REASONING_EFFORT` sets how much
the model reasons silently before answering. `"none"` (the default) starts replies immediately.
`"low"` adds a 3–5 s pause on a fast GPU but gives clearly better coaching (it weighs options and
makes fewer mistakes with the numbers). You can also change this under **Settings → AI coach
connection → Thinking before answering**.

### 3b. Keep Ollama on localhost (recommended)

**The iPhone never talks to Ollama.** It talks to OpenFit, and OpenFit's server calls
Ollama at `127.0.0.1` on the same PC. So Ollama doesn't need to be reachable from
your network, and it shouldn't be: **Ollama has no password**, so anyone who can
reach port 11434 can use your models.

Ollama's default is localhost-only. If you've previously set `OLLAMA_HOST=0.0.0.0`
(for example, to use Ollama from other machines over Tailscale), see
[Is it private?](#is-it-private-only-you-and-your-pc) below to choose how to lock it down.

**Don't set `OLLAMA_ORIGINS="*"`.** It lets any website you visit send prompts to your
models from your browser. OpenFit doesn't need it.

Only if Ollama runs on a **different machine** than OpenFit: set `OLLAMA_HOST=0.0.0.0`
on that machine, firewall port 11434 to just the OpenFit PC's IP, and set
`OLLAMA_BASE_URL=http://<that-machine>:11434` in `.env`.

### 3c. Check it

Open **Coach → stethoscope icon → Run checkup** (or Settings → *Full checkup*). It tests
that Ollama is running, the model is installed and answers, speed (tokens/s), GPU use,
whether the coach's prompt fits the context window, **whether Ollama is exposed to your
network**, and whether websites can reach it. **Test the coach** asks the AI thirteen basic
questions about sample data and checks the answers (uses data, stays safe, refuses
medication advice, ignores injected instructions, professional tone).

## 4. Find your PC's IP and open the firewall for OpenFit

```powershell
ipconfig     # "IPv4 Address" under your Wi-Fi/Ethernet adapter (the launcher also prints it)
```

Tip: set a DHCP reservation in your router so this address never changes. Your
Home Screen bookmark depends on it.

Allow the OpenFit port **only from your phone** (run PowerShell **as Administrator**;
replace `192.168.1.50` with your iPhone's IP: Settings → Wi-Fi → ⓘ next to your network):

```powershell
New-NetFirewallRule -DisplayName "OpenFit (iPhone only)" -Direction Inbound -Protocol TCP -LocalPort 3000,3443 -RemoteAddress 192.168.1.50 -Action Allow -Profile Private
```

Also make sure Windows treats your network as **Private**: Settings → Network &
internet → (your connection) → Network profile type → **Private**.

> iPhones use a random "private Wi-Fi address" per network, but it stays the same for a
> given network unless you reset it. If the app stops loading after an iOS update, check
> whether the phone's IP changed.

## Is it private? (only you and your PC)

| Layer | What protects it | Status after following this guide |
|---|---|---|
| Internet | Nothing is port-forwarded on your router; the PC has no public address | Not reachable from the internet |
| Other devices on your Wi-Fi → OpenFit | Firewall rule limited to your iPhone's IP, **plus** `APP_PASSCODE` | Only your phone, and only with the passcode |
| Malicious websites → OpenFit | Host check (blocks DNS rebinding), CSRF origin check, frame blocking | Blocked |
| Other devices → Ollama | Ollama listening on localhost only | Only programs on this PC |
| Malicious websites → Ollama | `OLLAMA_ORIGINS` not set | Blocked |
| Your data at rest | SQLite file on your PC (`prisma/openfit.db`) | Never leaves the PC; only food barcodes go to Open Food Facts |

**Lock Ollama down if `OLLAMA_HOST=0.0.0.0` is set** (the checkup's "Ollama is private to
this PC" check shows a warning). Pick one:

*Option A: localhost only* (simplest, if you don't use Ollama from other devices).
PowerShell **as Administrator**, then quit Ollama from the tray and start it again:

```powershell
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", "127.0.0.1:11434", "User")
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", $null, "Machine")
```

*Option B: keep remote access over Tailscale only.* Leave `OLLAMA_HOST` as is, and
disable the broad "allow ollama.exe from anywhere" rules Windows created on first run,
keeping your Tailscale-only rule. PowerShell **as Administrator**:

```powershell
Get-NetFirewallRule -DisplayName "ollama.exe" | Disable-NetFirewallRule
Get-NetFirewallRule -DisplayName "Ollama - Tailscale only" | Get-NetFirewallAddressFilter   # should show 100.64.0.0/255.192.0.0
```

Then run the checkup again. With option A the exposure check passes. With option B it
still sees the port open (it tests from the PC itself, which the firewall doesn't filter),
so confirm from your phone on Wi-Fi with Tailscale **off**: opening
`http://<pc-ip>:11434` should fail to load.

## 5. Run it and open it on your iPhone (HTTP, quickest)

```powershell
npm run dev        # listens on 0.0.0.0:3000
```

On the iPhone (same Wi-Fi), open **Safari** and go to:

```
http://<pc-ip>:3000
```

Everything works over plain HTTP **except the live camera viewfinder**. iOS only
allows `getUserMedia` on secure (HTTPS) origins. Until you finish step 6, the
scanner automatically switches to **"Take a photo of the barcode"**: it opens the
native camera and decodes the photo. You can also type the digits.

## 6. HTTPS: live barcode scanning and the offline service worker

iOS only allows the live camera and offline support on a secure (HTTPS) origin, and only
trusts certificates it knows. OpenFit makes its own small certificate authority for this.
It uses the OpenSSL that comes with Git and doesn't change Windows' trust store.

**On the PC** (once):

```powershell
npm run make:certs        # creates certs\rootCA.pem + certs\cert.pem for your PC's addresses
```

Then start OpenFit with the launcher. It switches to HTTPS automatically when `certs\` exists:
`https://<pc-ip>:3443`.

**On the iPhone** (once):

1. In **Safari**, open `https://<pc-ip>:3443/ca.crt`. Safari warns that the connection
   isn't private (expected, the phone doesn't trust the certificate yet). Tap **Show Details →
   visit this website → Visit Website**, then **Allow** the profile download.
2. Settings → **Profile Downloaded** (or General → VPN & Device Management) →
   *OpenFit Local CA* → **Install**.
3. Settings → General → About → **Certificate Trust Settings** → turn on
   *OpenFit Local CA* → Continue.
4. Open `https://<pc-ip>:3443` again. No warning this time.

If the PC's IP changes, the launcher notices and re-issues the certificate by itself (you can
also run `npm run make:certs`). It reuses the same authority, so there's nothing to reinstall
on the phone. Keep `certs\rootCA-key.pem` private and never
copy it off the PC. To undo, delete the profile under VPN & Device Management.

## 7. Add it to your Home Screen

1. Open the HTTPS URL in **Safari**. Other browsers on iOS can't install web apps.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Launch OpenFit from the icon. It opens full screen, without the Safari UI.
4. On the first scan, iOS asks for camera access. Tap **Allow**. In Home Screen
   mode iOS may ask again after the app has been closed for a while. That's normal.

If you denied camera access by mistake, go to Settings → Apps → Safari → Camera → **Ask** or **Allow**.

## 8. Daily use

- **Today** shows calories and macros against your goals, the weight trend and your workout count.
- **Train**: start a workout, then log sets (exercise, weight, reps, RPE, notes). The form keeps
  your last values so the next set is one tap, and it shows what you did last time.
- **Food**: scan a barcode, adjust grams, and pick a meal. Products are cached in SQLite, so
  re-scans are instant and work without internet.
- **Weight**: one weigh-in per day. The chart shows raw values plus a 7-entry moving average.
- **Coach**: "Review my week" sends your last 7 days of training, nutrition and weight trend
  to your local model. Expand "What the coach sees" to read the exact data block.
- **Settings** (gear icon on Today): goals, kg/lb, goal weight, Ollama address, model and
  thinking level (with a **Test connection** button), and a **Setup** checklist with your phone addresses.

Keep OpenFit running whenever you want to use the phone app. On Windows the desktop app does that:
it runs the server, stays in the tray when you close its window, and with **Start with Windows**
(tray icon menu) starts hidden when you sign in. Without the desktop app, double-click `OpenFit.cmd`,
or run `npm run start:https` at log-on with Task Scheduler or `pm2`.

## Logging with no signal

The phone keeps a copy of the app and of your main screens (Today, Food, Add food, Train, Weight,
Coach, Settings), refreshed in the background whenever it can reach the PC. With no signal, or away
from home without your VPN, the app opens from that copy in a couple of seconds and shows your data as
of the last refresh, instead of waiting for the PC.

Everything you log on the phone (food, sets, weigh-ins) is saved on the phone first and sent to the
PC in the background. In a gym basement, on a plane, or while the PC sleeps, just keep logging: a pill
above the tab bar says how many entries are waiting, and they go out by themselves when the PC is
reachable again (when the app is opened, the network comes back, or every 15 seconds). Each entry is
sent exactly once. If the PC refuses one (for example a set for a workout you deleted on the PC), tap
the pill to retry or discard it.

## AI food logging: snap or describe your meal

On **Add food**, the **Snap or describe it** card asks your local AI coach what you ate: take a photo
of your plate, type or dictate a description ("a chicken salad and a can of cola"), or both. You get a
list of foods with portions and macros to adjust (change the grams and the macros follow), then
**Add all** puts them in the meal you picked. Foods you've logged before and scanned products use their
real numbers instead of the AI's estimate. Photos need a vision model such as `gemma4` (the default);
with a text-only model, describe the food instead. The first photo after a restart can take up to half
a minute while the model loads.

## Modules (optional extras)

**Settings → Modules** lists extras you can switch on and off. They add screens and tools but never
change your data when switched off.

- **Pro training**: the full free-exercise-db library (about 870 exercises with photos and how-tos,
  downloaded once from GitHub when you switch it on, photos fetched as you view them and kept in
  `data/modules/training-pro/`), personal-record alerts, a plate and warm-up calculator under the
  weight field, a set-type picker (warm-up / work / drop), and **Train → Your programs** to build your own
  workouts next to the ready-made ones, including supersets (back to back, rest after the round).
  Setup asks whether you want it (older installs are asked once on the next launch); you can also run
  `node scripts/module.mjs enable training-pro`.

For developers: a module is a folder `src/modules/<id>/` with a `manifest.ts`, listed in
`src/lib/modules/registry.ts`. Core screens check `isModuleEnabled("<id>")` before showing its pieces.

## Import and Apple Health

**Settings → Import** reads a MyFitnessPal **Nutrition** export (one entry per meal: MyFitnessPal doesn't
export single foods), a **Strong** or **Hevy** workout CSV, or an OpenFit backup. It shows what's new and
what you already have before anything is written, and skips duplicates, so importing twice is safe.
Choose the weight unit for Strong files (they don't say).

**Settings → Apple Health** connects an iPhone Shortcut: make a device token there (it's shown once),
then build the Shortcut as the screen explains (Find Health Samples → Get Contents of URL with the token)
and run it every morning with an Automation. Weigh-ins from a smart scale, steps and active calories then
arrive by themselves, and the coach uses them. Revoke the token there to stop it at once.

## Desktop app (Windows and Mac): your progress on a big screen

The phone app is for logging. The desktop app is for looking back: a full-size dashboard
with charts of your body weight, calories and macros, protein, weekly training volume and
the progression of your main lifts, plus a **progress report** written by your AI coach.
Pick 7 days, 30 days, 3 months, 6 months or 1 year at the top; every chart, number and the
report use that range. Hover a chart (or focus it and use the arrow keys) to read exact
values, or open **Show as table** under it.

It reads the same database as the phone app, so nothing is copied or synced. On Windows it
*is* the phone app's server: opening it starts OpenFit (the same way `OpenFit.cmd` does, in a
hidden window), and closing its window keeps it running in the tray, so your phone can keep
connecting. The tray icon's menu shows your phone's addresses (click one to copy it), has
**Start with Windows** (OpenFit then starts hidden in the tray when you sign in) and **Quit**,
which stops OpenFit for the phone too. If OpenFit was already running when you opened the
app, the app uses it and leaves it running when you quit. On a Mac the app runs its own
private server on `127.0.0.1` instead; start the phone server separately there.

**Run it from the OpenFit folder** (after Setup, so the app is installed and built):

```
npm run desktop:install   # once: downloads Electron (about 100 MB)
npm run desktop
```

**Or build an installer** you can start from the Start menu / Applications folder:

```
cd desktop
npm run dist:win          # on Windows: desktop\dist\OpenFit Setup <version>.exe
npm run dist:mac          # on a Mac:   desktop/dist/OpenFit-<version>.dmg
```

On Windows the installer includes OpenFit itself. On a PC without OpenFit the app offers to
install it (choose **I already have OpenFit** to pick an existing folder instead), then runs
Setup in its own window and opens when Setup is done. If packages or the build go missing
later, it offers to run Setup again. Installing a newer `OpenFit-Setup` updates the OpenFit
folder and keeps your data (`.env`, the database, `data/`, `certs/`): quit OpenFit first
(tray icon, **Quit**, or close its server window if you started it with `OpenFit.cmd`). A git checkout is never overwritten; update it with `git pull`.
`npm run dist:win` bundles the committed files (`npm run bundle -- --working-tree` includes
uncommitted edits, for testing).

The Mac app asks once where your OpenFit folder is and remembers it. On a Mac, set
OpenFit up with `npm install && npm run build` in that folder first (Setup.cmd is
Windows-only). The installers aren't code-signed, so Windows SmartScreen and macOS
Gatekeeper ask you to confirm the first time you open it.

The coach report needs Ollama running, like the Coach tab. Reports are saved, so the
latest one shows as soon as the dashboard opens.

## Away from home (Tailscale, WireGuard, ZeroTier, NetBird or your own)

OpenFit is reachable outside your home network through a **private network** that your PC and
iPhone both join: an encrypted tunnel between your own devices. No router ports are opened, and
nobody outside that network can reach the app. Pick the one you like:

| Option | What it is | Phone app |
|---|---|---|
| **Tailscale** (default) | Easiest; free for personal use. Works with [Headscale](https://github.com/juanfont/headscale), the open-source server, too | Tailscale |
| **WireGuard** | Open source. You set up the tunnel (on your router, a server or another PC) and import it on both devices | WireGuard |
| **ZeroTier** | Open source. Both devices join the same network ID; works with your own controller | ZeroTier One |
| **NetBird** | Open source, WireGuard-based; free cloud or self-hosted | NetBird |
| **Other** | Anything else: OpenVPN, Nebula, a VPN on your router, a port forward. You enter the address | yours |
| **None** | Home Wi-Fi only | |

**Choose it** when Setup asks (step 6), or in the app under **Settings → Remote access**, or in
`.env` with `REMOTE_ACCESS` (`tailscale`, `wireguard`, `zerotier`, `netbird`, `custom` or `none`).
Then:

1. **PC:** run Setup. It installs the app you picked (except for Other), and tells you when
   it's connected. Sign in or activate your tunnel from its tray icon if asked.
2. **iPhone:** install the same app from the App Store and join the same network
   (same account, the matching WireGuard peer, or the same ZeroTier network ID).
3. **Restart OpenFit.** The launcher adds the PC's address on that network to the HTTPS
   certificate (keeping the same authority, so nothing to reinstall on the phone) and prints it
   as the **Anywhere** address, for example `https://<pc-name>.<your-tailnet>.ts.net:3443`
   or `https://10.8.0.2:3443`.
4. On the iPhone, open that **Anywhere** address and **Add to Home Screen from it**. It works at
   home and away (with the VPN app on), so you only need this one icon.

Fine-tuning, all optional (in Settings → Remote access → Advanced, or `.env`):

- `REMOTE_ADDRESS`: the address your phone uses when away, if the detected one isn't right
  (required for Other). It's added to the certificate and to the allowed host names.
- `REMOTE_INTERFACE`: the PC's network adapter to read its address from, when it has several
  tunnels (for example `wg0`, or the name of your OpenVPN adapter).
- `REMOTE_LOGIN_SERVER`: your own Headscale server (Tailscale) or NetBird management URL. Setup
  then shows the command to sign in against it (`tailscale up --login-server …` /
  `netbird up --management-url …`).

The PC still has to be on with the launcher running. A Home Screen icon added from the
`192.168.x.x` address only works on home Wi-Fi. Each address also has its own sign-in
(passcode cookie), but they all show the same data.

## Troubleshooting

| Symptom | Fix |
|---|---|
| iPhone can't load the page at all | Same Wi-Fi? Firewall rule added (with the right phone IP)? Network profile **Private**? Some routers have "AP/client isolation", which must be off. |
| Scanner only offers "Take a photo" | You're on `http://`. Use the HTTPS setup in step 6. |
| Safari: "This connection is not private" | The OpenFit Local CA isn't fully trusted on the phone (step 6, items 2–3), or the PC's IP changed and OpenFit hasn't been restarted since (the launcher refreshes the certificate on start). |
| "Camera access was denied" | Settings → Apps → Safari → Camera → Allow, then reload. |
| Coach: "Cannot reach Ollama … ECONNREFUSED" | Ollama isn't running, or the URL in Settings is wrong. Run `curl.exe http://127.0.0.1:11434/v1/models` on the PC. |
| Coach: "Model … is not installed" | `ollama pull <model>`, or choose one of the listed models in Settings. |
| Coach: "did not respond in time" | The model is still loading (the first request after a restart can take 30–90 s on CPU), or it's too large for your hardware. Try a 7–8B model. |
| Barcode "not found" | The product isn't in Open Food Facts yet. Add it manually (the form opens with the barcode filled in), and consider contributing it at openfoodfacts.org. |
| Phone says "Can't reach your PC" while the PC is on | OpenFit isn't running: open the **OpenFit** app (it keeps running in the tray when you close its window; tick **Start with Windows** in the tray menu to have it always on), or double-click `OpenFit.cmd`. Older versions froze when you clicked inside the server window (a Windows text selection pauses it until you press Esc); 0.1.4 turns that off. |
| Phone app opens slowly or shows old data away from home | It can't reach the PC (no signal, or your VPN app is off), so after about 2 seconds it shows the copy saved on the phone. What you log is kept on the phone and sent when the PC is reachable again. |
| `spawn … schema-engine-windows.exe ENOENT` | The project path is too long. Move it to a short path like `C:\dev\openfit`. |
