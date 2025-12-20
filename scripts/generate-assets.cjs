const fs = require("node:fs");
const path = require("node:path");
const { icnsBase64, trayBase64 } = require("./assets-base64.cjs");

const buildResourcesDir = path.join(__dirname, "..", "build-resources");
const iconPath = path.join(buildResourcesDir, "icon.icns");
const trayPath = path.join(buildResourcesDir, "trayTemplate.png");

const sanitizeBase64 = (data) => data.replace(/\s+/g, "");

const writeIfMissing = (filePath, base64Data) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const buffer = Buffer.from(sanitizeBase64(base64Data), "base64");
  fs.writeFileSync(filePath, buffer);
};

writeIfMissing(iconPath, icnsBase64);
writeIfMissing(trayPath, trayBase64);

console.log("Generated build resources:", {
  icon: iconPath,
  tray: trayPath,
});
