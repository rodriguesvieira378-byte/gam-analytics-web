import fs from "node:fs";
import path from "node:path";

const required = [
  "package.json",
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "components/GamApp.tsx",
  "lib/repository.ts",
  "lib/supabase.ts",
  "supabase/schema.sql",
  "supabase/seed.sql",
  ".env.example"
];

const missing = required.filter((file) => !fs.existsSync(path.resolve(file)));

if (missing.length > 0) {
  console.error("Arquivos ausentes:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
for (const script of ["dev", "build", "start"]) {
  if (!pkg.scripts?.[script]) {
    console.error(`Script npm ausente: ${script}`);
    process.exit(1);
  }
}

console.log("Estrutura do GAM Analytics Web validada.");
