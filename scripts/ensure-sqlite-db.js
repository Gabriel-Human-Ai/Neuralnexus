const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function databasePathFromUrl(url) {
  if (!url || !url.startsWith("file:")) return null;
  const raw = url.replace(/^file:/, "");
  if (!raw || raw === ":memory:") return null;
  return path.isAbsolute(raw) ? raw : path.resolve(__dirname, "..", "prisma", raw);
}

function splitSql(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function main() {
  const dbPath = databasePathFromUrl(process.env.DATABASE_URL);
  if (!dbPath) return;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.$queryRawUnsafe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='DecisionRecord' LIMIT 1",
    );
    if (Array.isArray(existing) && existing.length > 0) return;

    const migrationPath = path.resolve(__dirname, "..", "prisma", "migrations", "20260711230000_init", "migration.sql");
    const migration = fs.readFileSync(migrationPath, "utf8");
    for (const statement of splitSql(migration)) {
      await prisma.$executeRawUnsafe(statement);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
