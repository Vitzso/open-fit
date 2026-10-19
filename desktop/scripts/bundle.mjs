// Copies OpenFit itself (the committed files at HEAD, without desktop/) into desktop/bundle/openfit,
// which the Windows installer ships so the app can install OpenFit on a PC that doesn't have it.
// Committed files only: no .env, database, node_modules or build output ever end up in the installer.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = path.resolve(desktop, "..");
const out = path.join(desktop, "bundle", "openfit");
const git = (args, env) => execFileSync("git", args, { cwd: repo, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

// --working-tree: tracked files as they are on disk now, uncommitted edits included (for testing).
const workingTree = process.argv.includes("--working-tree");
const dirty = git(["status", "--porcelain", "--untracked-files=no"]).trim();
if (dirty && !workingTree) console.warn("Note: uncommitted changes are not included; the bundle is HEAD.\n" + dirty);

fs.rmSync(path.join(desktop, "bundle"), { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const list = workingTree ? git(["ls-files"]) : git(["ls-tree", "-r", "--name-only", "HEAD"]);
const files = list.split("\n").filter((f) => f && !f.startsWith("desktop/") && (!workingTree || fs.existsSync(path.join(repo, f))));
if (workingTree) {
  for (const f of files) fs.cpSync(path.join(repo, f), path.join(out, f));
} else {
  // Check HEAD out through a throwaway index (keeps .gitattributes line endings: CRLF .ps1/.cmd).
  const index = path.join(os.tmpdir(), `openfit-bundle-${process.pid}.index`);
  try {
    git(["--work-tree", out, "checkout", "HEAD", "--", ".", ":(exclude)desktop"], { GIT_INDEX_FILE: index });
  } finally {
    fs.rmSync(index, { force: true });
  }
}

// The list of installed files (saved with them), so a later update can remove files a new version no longer has.
const { version } = JSON.parse(fs.readFileSync(path.join(out, "package.json"), "utf8"));
fs.writeFileSync(path.join(out, "openfit-files.json"), JSON.stringify({ version, files }, null, 1));
console.log(`Bundled OpenFit ${version} (${files.length} files) into ${path.relative(repo, out)}`);
