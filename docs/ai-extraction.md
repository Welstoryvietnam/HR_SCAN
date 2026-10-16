# Independent OCR extraction

The live intake flow no longer calls Gemini or OpenAI. No provider API key is
needed. Tesseract.js runs Vietnamese and English OCR in an isolated server worker;
the language models are bundled dependencies, not downloaded at request time.
Hosting CPU/memory quotas still apply.

## API

Both endpoints require a signed application session in `Authorization: Bearer`.
They never accept an external document URL and never save a completed employee.

- `POST /api/ocr/recognize`: `{mimeType, base64Data}` for one PNG/JPEG image.
  Returns `{success, data:{page,text,confidence,lines}, engine, requestId}`.
  Limits: 3 MB binary, 12 million pixels, 8,000 px per edge, 45-second worker
  deadline. Only one OCR task runs per function instance; busy requests return
  429 with Retry-After. The worker is terminated after completion or failure.
- `POST /api/ocr/extract-profile`: `{documents:[{id,docType,pages}]}`.
  Maps recognized labels to personnel fields using code, not an LLM. Limits:
  100 documents, 30 pages/document, 100,000 characters/page and 300,000 total.
- The retired `/api/ai/extract-documents` returns HTTP 410, asking old browser
  builds to refresh. It does not fall back to Gemini.

Logs contain request IDs, duration and status only. Uploaded images stay in worker
memory; temporary filesystem files contain only the reusable language models.
Worker stdout/stderr is discarded because engine diagnostics may contain text.

## Browser flow

Employees run sequentially. Each image calls OCR individually. PDF.js processes
PDFs page by page: a page with sufficient text and no raster images uses its text
layer; scanned or mixed pages render to JPEG and call the OCR API. All pages are
processed, up to 30 per PDF. The browser must remain open while processing.

OCR results are cached per uploaded document/page in the intake draft. Retries
skip finished pages and unchanged successful employees. Each employee result is
shown immediately and checkpoints the private cloud draft. A failed cloud save
stops automatic saving for that run and warns the user to save manually; the
result remains on screen. Existing limits (16 MB, 100 files, 20 drafts/account)
still apply. This is not a durable background queue.

## Accuracy and review

Labels are recognized with Vietnamese accent-insensitive matching. Dates and
12-digit CCCD values are validated. Conflicting names/CCCD values remain blank.
VNeID permanent addresses take priority over older CCCD addresses. Temporary
addresses are not substituted for permanent addresses. All OCR profiles require
human review, especially Vietnamese diacritics and identifier digits.

Only explicit VNeID member cards or clearly delimited tables populate household
members. SYLL relatives are never used as household members. Complex scanned
tables, handwriting, CV job descriptions and SYLL family lists can require manual
entry; unsupported structure is flagged rather than guessed. Missing nationality
and ethnicity stay blank. OCR saves `extractionMethod: ocr` and
`aiVisionExtracted: false`; the dashboard digitalization metric also includes
legacy AI records.

## Deployment and validation

`vercel.json` includes the isolated worker, Tesseract worker/core and language
assets. Keep these files in the deployed function. Run the tests from the project
root, so worker paths resolve consistently with the server's existing convention.

`node --import tsx --test tests/ocr.test.ts` covers labeled Vietnamese fields,
conflicts, invalid dates, VNeID/SYLL separation, bounded image inputs, actual OCR
on a synthetic PNG, and concurrent-request limits. Batch tests cover 10 employees,
retry-only-failed and pausing. Local API validation processed ten repeated copies
of that clear synthetic image sequentially in about 16 seconds. This is a fixture
measurement, not a throughput guarantee for ten real multi-page dossiers.
