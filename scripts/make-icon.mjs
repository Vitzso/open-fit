// Renders the OpenFit app icon (same design as src/lib/icon.tsx) into a
// multi-size Windows .ico for the desktop launcher, and the desktop app's icons.
//   node scripts/make-icon.mjs   →   launcher/openfit.ico (+ openfit.png preview)
//                                    desktop/build/icon.ico + icon.png (1024 px, macOS needs 512+)
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const SIZES = [16, 24, 32, 48, 64, 128, 256];

function iconTree(size) {
  const s = size / 512;
  const bar = (w, ht, r, ml = 0) =>
    h("div", { style: { width: w * s, height: ht * s, background: "#09090b", borderRadius: r * s, marginLeft: ml * s } });
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #10b981 0%, #047857 100%)",
        // Rounded square so it reads as an app tile on the desktop.
        borderRadius: 96 * s,
      },
    },
    h("div", { style: { display: "flex", alignItems: "center" } }, [
      bar(44, 190, 18),
      bar(30, 130, 12, 10),
      bar(150, 36, 0),
      bar(30, 130, 12),
      bar(44, 190, 18, 10),
    ]),
  );
}

async function renderPng(size) {
  const res = new ImageResponse(iconTree(size), { width: size, height: size });
  return Buffer.from(await res.arrayBuffer());
}

/** ICO container holding PNG images (supported since Windows Vista). */
function packIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o); // 0 means 256
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2); // palette colors
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.png)]);
}

const images = [];
for (const size of SIZES) images.push({ size, png: await renderPng(size) });
mkdirSync("launcher", { recursive: true });
writeFileSync("launcher/openfit.ico", packIco(images));
writeFileSync("launcher/openfit.png", images.at(-1).png);
console.log(`launcher/openfit.ico written (${SIZES.join(", ")} px)`);

// The desktop app (desktop/): electron-builder picks these up from desktop/build.
mkdirSync("desktop/build", { recursive: true });
writeFileSync("desktop/build/icon.ico", packIco(images));
writeFileSync("desktop/build/icon.png", await renderPng(1024));
console.log("desktop/build/icon.ico and icon.png written");
