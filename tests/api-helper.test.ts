import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeFetchJson } from '../src/utils/apiHelper.js';

test('an HTTP 200 HTML rewrite is an API error, not a successful extraction', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<!doctype html><html>SPA</html>', {status:200});
  try {
    const result = await safeFetchJson('/api/ai/extract-documents');
    assert.equal(result.ok,false);
    assert.match(result.error || '',/HTML/);
  } finally { globalThis.fetch = original; }
});

test('oversized AI uploads are rejected before reaching the Vercel body limit', async () => {
  const original = globalThis.fetch;
  let requested = false;
  globalThis.fetch = async () => { requested = true; return new Response('{}'); };
  try {
    const result = await safeFetchJson('/api/ai/extract-documents', {method:'POST',body:'a'.repeat(4_000_001)});
    assert.equal(result.ok,false);
    assert.equal(requested,false);
    assert.match(result.error || '',/dung lượng/);
  } finally { globalThis.fetch = original; }
});
