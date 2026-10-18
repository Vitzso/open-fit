// Production HTTPS server: `npm run build && npm run start:https`.
// iOS Safari only grants camera access and registers service workers on a
// secure origin, and `next start` cannot serve HTTPS by itself.
import { spawn } from "node:child_process";
import { createServer } from "node:https";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, resolve } from "node:path";

const port = Number(process.env.PORT ?? 3443);
const keyPath = process.env.TLS_KEY ?? "certs/key.pem";
const certPath = process.env.TLS_CERT ?? "certs/cert.pem";
const caPath = process.env.TLS_CA ?? "certs/rootCA.pem";

if (!existsSync(keyPath) || !existsSync(certPath)) {
  console.error(`Missing TLS files (${keyPath}, ${certPath}). Run: npm run make:certs (see SETUP.md step 6).`);
  process.exit(1);
}

// Next.js sometimes fetches pages from this same server (e.g. to stream the
// page a server action redirects to). Those requests use OpenFit's private
// certificate, which Node doesn't trust by default ("unable to verify the first
// certificate"). NODE_EXTRA_CA_CERTS adds our CA to Node's normal public ones,
// but it's only read at startup, so relaunch once with it set.
if (existsSync(caPath) && !process.env.OPENFIT_CA_LOADED) {
  const child = spawn(process.execPath, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, NODE_EXTRA_CA_CERTS: extraCaBundle(caPath), OPENFIT_CA_LOADED: "1" },
  });
  for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
    process.on(signal, () => child.kill(signal === "SIGBREAK" ? "SIGTERM" : signal));
  }
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
} else {
  await startServer();
}

/**
 * The file to pass as NODE_EXTRA_CA_CERTS. Node reads only one file, so if it's
 * already set (a company VPN or antivirus CA, for example), merge that CA with
 * ours instead of skipping ours, which broke those internal requests.
 */
function extraCaBundle(ca) {
  const existing = process.env.NODE_EXTRA_CA_CERTS;
  if (!existing || resolve(existing) === resolve(ca)) return resolve(ca);
  try {
    const merged = resolve(dirname(ca), "node-extra-ca.pem");
    writeFileSync(merged, `${readFileSync(existing, "utf8").trim()}\n${readFileSync(ca, "utf8")}`);
    return merged;
  } catch {
    return resolve(ca); // unreadable existing bundle: trusting our own CA matters more here
  }
}

async function startServer() {
  const { default: next } = await import("next");
  // `hostname` is only what Next.js uses to build its own internal URLs; the
  // server itself still listens on all interfaces below. It must be a real,
  // connectable name covered by the certificate: "0.0.0.0" made internal
  // requests fail (and once leaked into redirects as https://0.0.0.0:3443).
  const app = next({ dev: false, hostname: "localhost", port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, (req, res) => handle(req, res));
  // Keep idle connections open between taps. Node's 5 s default meant the phone
  // usually had to open a new TCP + TLS connection for each tap: two extra round
  // trips (~0.6 s over mobile data/Tailscale) before the request even started.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000; // must exceed keepAliveTimeout
  server.listen(port, "0.0.0.0", () => {
    const ips = Object.values(networkInterfaces())
      .flat()
      .filter((i) => i && i.family === "IPv4" && !i.internal)
      .map((i) => i.address);
    console.log(`> OpenFit (HTTPS) ready`);
    for (const ip of ["localhost", ...ips]) console.log(`  https://${ip}:${port}`);
  });
}
