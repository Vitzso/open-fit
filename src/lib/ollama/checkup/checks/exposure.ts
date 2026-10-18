// Check 7: is Ollama reachable from other devices on the network?
import { networkInterfaces } from "node:os";
import { getJson } from "../probe";
import type { Check, CheckStep } from "../types";

const LOCAL_HOSTS = ["127.0.0.1", "localhost", "::1", "[::1]"];

/** This PC's real IPv4 addresses (no loopback or link-local). */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal && !i.address.startsWith("169.254."))
    .map((i) => i!.address);
}

/** Addresses on which Ollama also answers. */
async function openOn(ips: string[], port: string): Promise<string[]> {
  const results = await Promise.all(
    ips.map((ip) =>
      getJson(`http://${ip}:${port}/api/version`, { timeoutMs: 1500 }).then(
        () => ip,
        () => null, // not listening there: good
      ),
    ),
  );
  return results.filter((ip): ip is string => ip !== null);
}

/** Probes Ollama on every LAN address when OpenFit uses it over localhost. */
export const checkExposure: CheckStep = async ({ cfg, reachable }) => {
  if (!reachable) return [];
  const { hostname, port: rawPort } = new URL(cfg.baseUrl);
  const port = rawPort || "11434";
  if (!LOCAL_HOSTS.includes(hostname)) {
    return [
      {
        id: "exposure",
        label: "Ollama network exposure",
        status: "skip",
        detail: `Ollama runs on another machine (${hostname}), so it must be reachable over the network. Make sure that network is trusted.`,
      },
    ];
  }
  return [exposureLine(await openOn(lanAddresses(), port), port)];
};

/** Pass when private; a warning listing the exposed addresses otherwise. */
function exposureLine(open: string[], port: string): Check {
  const label = "Ollama is private to this PC";
  if (open.length === 0) {
    return {
      id: "exposure",
      label,
      status: "pass",
      detail: "Only listening on localhost. Other devices can't use it, and OpenFit doesn't need them to.",
    };
  }
  return {
    id: "exposure",
    label,
    status: "warn",
    detail: `Also listening on ${open.map((ip) => `${ip}:${port}`).join(", ")}. Any device that can reach those addresses can use your models with no password, unless the firewall blocks port ${port}.`,
    fix: 'OpenFit talks to Ollama over 127.0.0.1, so it doesn\'t need this. To lock it down, set OLLAMA_HOST=127.0.0.1 and restart Ollama, or restrict port 11434 in Windows Firewall (see SETUP.md, "Is it private?").',
  };
}
