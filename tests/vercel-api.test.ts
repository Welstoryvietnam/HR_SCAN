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
  assert.deepEqual(await health.json(), {success:true,service:'hr-scan-api',ocrEngine:'tesseract',ocrLanguages:['vie','eng']});
  const records = await fetch(`${baseUrl}/api/sheets/tieu-chuan-luong`);
  assert.equal(records.status,200);
  assert.ok(Array.isArray((await records.json()).data));
});

test('legacy Gemini route is retired and never returns a blank profile', async () => {
  const response=await fetch(`${baseUrl}/api/ai/extract-documents`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images:[]})});
  assert.equal(response.status,410);assert.equal((await response.json()).success,false);
});

test('dedicated OCR endpoints require a verified session',async()=>{
  for(const endpoint of ['recognize','extract-profile']) {
    const response=await fetch(`${baseUrl}/api/ocr/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(response.status,401);assert.equal((await response.json()).success,false);
  }
});

test('unknown API routes return JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/unknown`);
  assert.equal(response.status,404);
  assert.equal((await response.json()).success,false);
});
