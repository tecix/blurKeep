#!/usr/bin/env node
'use strict';

/**
 * Bumps the version in manifest.json (source of truth) and package.json,
 * then commits and tags the change so pushing the tag triggers the AMO
 * release workflow.
 *
 * Usage: node scripts/bump-version.js <patch|minor|major>
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'manifest.json');
const PACKAGE_PATH = path.join(ROOT, 'package.json');

const bumpType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: npm run bump -- <patch|minor|major>');
  process.exit(1);
}

function bumpSemver(version, type) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Cannot parse version "${version}" as semver`);
  }
  let [major, minor, patch] = parts;
  if (type === 'major') { major += 1; minor = 0; patch = 0; }
  else if (type === 'minor') { minor += 1; patch = 0; }
  else { patch += 1; }
  return `${major}.${minor}.${patch}`;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

const manifest = readJson(MANIFEST_PATH);
const pkg = readJson(PACKAGE_PATH);

const newVersion = bumpSemver(manifest.version, bumpType);

manifest.version = newVersion;
pkg.version = newVersion;

writeJson(MANIFEST_PATH, manifest);
writeJson(PACKAGE_PATH, pkg);

console.log(`Bumped version: ${newVersion}`);

const git = (args) => execFileSync('git', args, { cwd: ROOT, stdio: 'inherit' });

git(['add', 'manifest.json', 'package.json']);
git(['commit', '-m', `Bump version to ${newVersion}`]);
git(['tag', `v${newVersion}`]);

console.log(`\nCreated commit and tag v${newVersion}.`);
console.log('Push both to trigger the AMO release workflow:');
console.log('  git push && git push --tags');
