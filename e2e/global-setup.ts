// e2e/global-setup.ts
import { rmSync } from "node:fs";

export default function globalSetup() {
  for (const suffix of ["", "-wal", "-shm"]) rmSync(`data/e2e.db${suffix}`, { force: true });
}
