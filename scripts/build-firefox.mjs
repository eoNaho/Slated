#!/usr/bin/env node
/**
 * Build script — Firefox (MV3)
 *
 * Generates dist/pixelreel-firefox-<version>.zip
 *
 * O que faz:
 *  1. Copia todos os arquivos da extensão para um dir temporário
 *  2. Substitui manifest.json pelo manifest.firefox.json (MV3 com gecko settings)
 *  3. Roda web-ext build no dir temporário
 *  4. Move o .zip final para dist/ e limpa o temporário
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXT_DIR = path.join(ROOT, "extension");
const TMP_DIR = path.join(ROOT, ".firefox-build-tmp");
const DIST_DIR = path.join(ROOT, "dist");

// ── 1. Limpar e criar temp dir ──────────────────────────────────────────────

if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(DIST_DIR, { recursive: true });

// ── 2. Copiar arquivos da extensão ──────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(EXT_DIR, TMP_DIR);

// ── 3. Substituir manifest.json pelo Firefox MV3 ────────────────────────────

const ffManifest = path.join(TMP_DIR, "manifest.firefox.json");
const mainManifest = path.join(TMP_DIR, "manifest.json");
fs.copyFileSync(ffManifest, mainManifest);
fs.unlinkSync(ffManifest);

// ── 4. web-ext build ────────────────────────────────────────────────────────

const manifest = JSON.parse(fs.readFileSync(mainManifest, "utf8"));
const version = manifest.version;
const outputFilename = `pixelreel-firefox-${version}.zip`;

console.log("Building Firefox extension (MV3)...");

execSync(
  `npx web-ext build --source-dir "${TMP_DIR}" --artifacts-dir "${DIST_DIR}" --filename "${outputFilename}" --overwrite-dest`,
  { stdio: "inherit" }
);

// ── 5. Limpeza ───────────────────────────────────────────────────────────────

fs.rmSync(TMP_DIR, { recursive: true });

console.log(`\nDone! → dist/${outputFilename}`);
