#!/usr/bin/env node
'use strict';

/**
 * Uploads the AMO listing icon and screenshot for BlurKeep.
 *
 * web-ext's --amo-metadata only patches plain JSON fields (name, summary,
 * description, categories, ...). The listing icon and screenshots are
 * binary uploads AMO only accepts via separate multipart/form-data
 * endpoints, so this is a standalone script rather than part of the
 * automatic release workflow. Run it manually whenever icon-128.jpg or
 * screenshot.jpg change.
 *
 * Usage:
 *   AMO_JWT_ISSUER=... AMO_JWT_SECRET=... node scripts/upload-listing-assets.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'manifest.json');
const ICON_PATH = path.join(ROOT, 'icon-128.jpg');
const SCREENSHOT_PATH = path.join(ROOT, 'screenshot.jpg');
const API_BASE = 'https://addons.mozilla.org/api/v5';

const issuer = process.env.AMO_JWT_ISSUER;
const secret = process.env.AMO_JWT_SECRET;

if (!issuer || !secret) {
  console.error('Set AMO_JWT_ISSUER and AMO_JWT_SECRET before running this script.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const addonGuid = manifest.browser_specific_settings.gecko.id;

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { iss: issuer, jti: crypto.randomUUID(), iat: now, exp: now + 60 };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${unsigned}.${signature}`;
}

async function request(pathname, { method, form }) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { Authorization: `JWT ${makeJwt()}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${pathname} failed (${res.status}): ${text}`);
  }
  console.log(`${method} ${pathname} -> ${res.status}`);
  return text ? JSON.parse(text) : null;
}

async function uploadIcon() {
  const form = new FormData();
  form.append('icon', new Blob([fs.readFileSync(ICON_PATH)], { type: 'image/jpeg' }), 'icon-128.jpg');
  await request(`/addons/addon/${addonGuid}/`, { method: 'PATCH', form });
  console.log('Icon uploaded.');
}

async function uploadScreenshot() {
  const form = new FormData();
  form.append('image', new Blob([fs.readFileSync(SCREENSHOT_PATH)], { type: 'image/jpeg' }), 'screenshot.jpg');
  await request(`/addons/addon/${addonGuid}/previews/`, { method: 'POST', form });
  console.log('Screenshot uploaded.');
}

(async () => {
  await uploadIcon();
  await uploadScreenshot();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
