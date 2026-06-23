#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const mode = readArg('mode', 'patch');
const arch = readArg('arch', 'universal');
const root = path.resolve(__dirname, '../..');
const androidRoot = path.join(root, 'android');
const appBuildGradle = path.join(androidRoot, 'app', 'build.gradle');

if (!fs.existsSync(appBuildGradle)) {
  throw new Error('android/app/build.gradle was not found. Run `npx cap add android` first.');
}

const abiByArch = {
  armv7: ["'armeabi-v7a'"],
  arm64: ["'arm64-v8a'"],
  universal: ["'armeabi-v7a'", "'arm64-v8a'"],
};

if (!abiByArch[arch]) {
  throw new Error(`Unsupported Android arch "${arch}". Use armv7, arm64, or universal.`);
}

let gradle = fs.readFileSync(appBuildGradle, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode 1');
gradle = gradle.replace(/versionName\s+"[^"]+"/, 'versionName "2.6.1-android"');

const abiBlock = `        ndk {\n            abiFilters ${abiByArch[arch].join(', ')}\n        }`;
if (/abiFilters\s+/.test(gradle)) {
  gradle = gradle.replace(/\s*ndk\s*\{\s*abiFilters[^}]+\}/m, `\n${abiBlock}`);
} else if (/defaultConfig\s*\{/.test(gradle)) {
  gradle = gradle.replace(/defaultConfig\s*\{/, (match) => `${match}\n${abiBlock}`);
}

fs.writeFileSync(appBuildGradle, gradle);
console.log(`Applied Android ${mode} mode patch for ${arch} (${abiByArch[arch].join(', ')}).`);
