// Measures the size of all compiled JS files in dist/.
// Run: npm run build && npm run bundle:measure
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found — run `npm run build` first");
  process.exit(1);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const jsFiles = walk(distDir).filter((f) => f.endsWith(".js"));

jsFiles.forEach((f) => {
  const size = fs.statSync(f).size;
  const rel = path.relative(distDir, f);
  console.log(`${String(size).padStart(9)} B  ${rel}`);
});

const total = jsFiles.reduce((sum, f) => sum + fs.statSync(f).size, 0);
console.log(`\nTotal: ${total} bytes (${Math.round(total / 1024)} KB uncompressed)`);
console.log("Note: gzip compression typically reduces this by ~65-70%");
