import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * Serves the PUBLIC certificate of OpenFit's local certificate authority
 * (certs/rootCA.pem, made by launcher/make-certs.ps1) so the iPhone can
 * install and trust it: open https://<pc-ip>:3443/ca.crt in Safari.
 * The private key (rootCA-key.pem) is never served.
 */
export async function GET() {
  try {
    const pem = await readFile(path.join(process.cwd(), "certs", "rootCA.pem"));
    return new Response(pem, {
      headers: {
        // iOS offers to install a configuration profile for this type.
        "Content-Type": "application/x-x509-ca-cert",
        "Content-Disposition": 'attachment; filename="OpenFit-Local-CA.crt"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("No certificate yet. Run launcher\\make-certs.ps1 on the PC.", { status: 404 });
  }
}
