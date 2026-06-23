import { mkdir, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const packageRoot = path.join(repoRoot, "packages", "cli");
const bunHome = process.env.BUN_INSTALL ?? path.join(homedir(), ".bun");
const globalRoot = path.join(bunHome, "install", "global");
const globalPackageDir = path.join(globalRoot, "node_modules", "@codeflow");
const linkedPackage = path.join(globalPackageDir, "cli");
const binDir = path.join(bunHome, "bin");

async function ensurePackageLink() {
  await mkdir(globalPackageDir, { recursive: true });

  if (existsSync(linkedPackage)) {
    const currentTarget = await readlink(linkedPackage).catch(() => null);
    if (currentTarget && path.resolve(currentTarget) === packageRoot) {
      return;
    }

    await rm(linkedPackage, { force: true, recursive: true });
  }

  await symlink(packageRoot, linkedPackage, "junction");
}

async function ensureBinShims() {
  await mkdir(binDir, { recursive: true });

  const launcher = path.join(packageRoot, "bin", "codeflow");
  const cmdShim = `@echo off\r\nbun "${launcher}" %*\r\n`;
  const psShim = `bun "${launcher}" @args\r\n`;
  const shellShim = `#!/usr/bin/env sh\nexec bun "${launcher}" "$@"\n`;

  await writeFile(path.join(binDir, "codeflow.cmd"), cmdShim);
  await writeFile(path.join(binDir, "codeflow.ps1"), psShim);
  await writeFile(path.join(binDir, "codeflow"), shellShim);
}

await ensurePackageLink();
await ensureBinShims();

console.log(`Linked codeflow -> ${packageRoot}`);
