import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';

// Import the exact Vercel entry point without starting the development server.
process.env.VERCEL = '1';
process.env.GEMINI_API_KEY = '';
let server: Server;
let baseUrl: string;

before(async () => {
  const { default: app } = await import('../api/index.js');
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => { await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve())); });

test('Vercel handler serves JSON API routes rather than the SPA', async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.match(health.headers.get('content-type') || '', /application\/json/);
  assert.deepEqual(await health.json(), {success:true,service:'hr-scan-api',geminiConfigured:false});
  const records = await fetch(`${baseUrl}/api/sheets/tieu-chuan-luong`);
  assert.equal(records.status,200);
  assert.ok(Array.isArray((await records.json()).data));
});

test('AI accepts POST and validates the request instead of returning HTTP 405', async () => {
  const response = await fetch(`${baseUrl}/api/ai/extract-documents`, {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images:[]}),
  });
  assert.equal(response.status,400);
  assert.ok((await response.json()).error);
});

test('missing Gemini key returns an actionable failure, never a blank successful profile', async () => {
  const response = await fetch(`${baseUrl}/api/ai/extract-documents`, {
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({images:[{mimeType:'image/png',base64Data:'test'}]}),
  });
  assert.equal(response.status,503);
  const body = await response.json();
  assert.equal(body.success,false);
  assert.match(body.error,/GEMINI_API_KEY/);
  assert.equal(body.data,undefined);
});

test('unknown API routes return JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/unknown`);
  assert.equal(response.status,404);
  assert.equal((await response.json()).success,false);
});
