# Resilient batch extraction

Step 1 processes employees sequentially. Completed results are identified by the
immutable IDs of their uploaded documents; unchanged successful employees are
skipped on subsequent runs. Adding/removing a document invalidates that marker.
The browser must remain open while extracting. Pause finishes the current
employee and stops before starting the next one.

Each terminal result updates the screen immediately and attempts to save the
whole intake snapshot through the existing private draft API. Saves use the
latest optimistic version and run sequentially. After a cloud save failure,
automatic saving stops for that run, results remain on screen, and the user must
save manually or resolve the conflict. Existing draft limits (16 MB, 100 files)
still apply. Closing the tab can only recover the last successful cloud snapshot;
this is not a server-side background queue.

Gemini uses `gemini-3.8-flash`, then `gemini-3.1-flash-lite`. Each gets at most
24 seconds when OpenAI is absent. With OpenAI configured the budgets are 16, 14,
and 18 seconds respectively, within a 50-second provider budget and the existing
60-second Vercel function duration. The browser retries transient failures up to
twice, with exponential delay and jitter. A Retry-After over 30 seconds defers to
manual retry rather than blocking the entire batch for that interval.

Optional server-only variables:

- `OPENAI_API_KEY`: enables the fallback; leave unset to use Gemini only.
- `OPENAI_VISION_MODEL`: defaults to `gpt-4.1-mini`.

OpenAI receives the same documents and prompt only if the Gemini attempts fail,
using Responses API with `store:false`. Never put credentials in a `VITE_*`
variable. Logs contain request ID, provider/model, status and elapsed time, not
documents or raw provider messages. Truncated JSON is rejected instead of being
patched into a potentially incomplete successful profile.

Images preserve aspect ratio, up to 1800 px width / 3200 px height. JPEG quality
adapts to size, and PNG is retained when smaller. PDF.js reads a supplemental text
layer for up to 30 pages / 60,000 characters. Original PDFs are still sent so
tables and mixed scanned pages can be checked visually; this does not replace
OCR, reduce every PDF, crop borders or straighten photographed documents.

Validation: `node --import tsx --test tests/ai-resilience.test.ts` includes a
10-person simulated queue, retry-only-failed, pausing, timeout budgets, 429/503,
invalid/truncated responses and a mocked OpenAI transport. This is not a claim
of production throughput or a comparative accuracy benchmark.
