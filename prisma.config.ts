// prisma.config.ts — Prisma v7 config
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Used by Prisma Migrate (direct connection, no pgbouncer)
    url: process.env["DIRECT_URL"]!,
  },
});
