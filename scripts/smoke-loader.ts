import fs from "fs";
import path from "path";

const registries = [
  { label: "command", root: "src/commands" },
  { label: "button", root: "src/buttons" },
];

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return /\.ts$/.test(entry.name) ? [target] : [];
  });
}

const failures: string[] = [];
let scanned = 0;
let loaded = 0;

for (const { label, root } of registries) {
  const seen = new Map<string, string>();

  for (const file of walk(root)) {
    scanned += 1;

    try {
      const module = require(path.resolve(file)) as { name?: string; execute?: unknown };

      if (!module.name) {
        failures.push(`${file}: missing exported "name"`);
      } else if (module.execute === undefined) {
        failures.push(`${file}: missing exported "execute"`);
      } else if (seen.has(module.name)) {
        failures.push(`${file}: duplicate ${label} "${module.name}" (also ${seen.get(module.name)})`);
      } else {
        seen.set(module.name, file);
        loaded += 1;
      }
    } catch (error) {
      failures.push(`${file}: ${error}`);
    }
  }
}

console.log(`modules scanned : ${scanned}`);
console.log(`loaded cleanly  : ${loaded}`);

if (failures.length > 0) {
  console.log("\nproblems:");
  failures.forEach((line) => console.log(`  - ${line}`));
  process.exit(1);
}

console.log("\nAll modules load with unique names per registry.");