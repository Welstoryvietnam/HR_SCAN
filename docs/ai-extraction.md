# Independent OCR extraction

The intake flow uses local OCR first. Optional Gemini assistance can read weak
pages after OCR; OpenAI is not used. Tesseract.js runs Vietnamese and English OCR in an isolated server worker;
the language models are bundled dependencies, not downloaded at request time.
Hosting CPU/memory quotas still apply.

Gemini is disabled by default and local OCR needs no provider key. Step 1 offers
an image preview with left/right quarter-turns and a drag-to-crop frame. Applying
an edit invalidates cached OCR for that file; cancel leaves the document intact.
Image sizing bounds the short edge at 1800px and long edge at 3200px, so sideways
photos retain the same detail as upright photos. Uploaded PDFs keep their source
and continue to render page by page for local OCR.

The isolated worker uses Sharp for physical quarter-turns. A weak first result
first tries sparse-text recognition on the unchanged image. Recognisable upright
labels and values prevent rotation even if birth/expiry fields are missing or
confidence is low. Only an unresolved direction triggers bounded quarter-turn
probes; the worker never crops automatically. It selects one coherent
result using the fields actually extracted by the profile parser, with identity
labels and dates guiding which orientations to try. The 45-second deadline
remains enforced and a best partial checkpoint can
be returned when the deadline expires; HR must still review incomplete fields.

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
  builds to refresh. Use the separate assistance endpoint below.

## Optional Gemini assistance

The structured personal-field extraction and SOP rules are adapted from the
Gemini-only version at commit `7064d7d`, before `3a9e116` replaced it with OCR.
The initial AI application is in `6987080`. Those versions call Google's hosted
Gemini API using `GEMINI_API_KEY`; no model weights or bundled/free AI engine
exist in the repository. Reusing their code does not change API billing.

Assistance now returns personal fields as JSON (name, CCCD, birth/issue/expiry
dates, ethnicity, gender, marital status, addresses, mobile and email), alongside
the transcription. Validated fields enter the current page-merging workflow even
when OCR labels were damaged. Empty gender/ethnicity stay empty. Explicit
“Không thời hạn” is supported, and both permanent address and hometown prefer
VNeID. Complex household/relative lists still use the current extraction rules
on the separate transcribed sections; this is not a full restoration of the old
multi-document AI route. Truncated JSON repair, automatic model/provider cascades
and the old UI/storage flow are not restored.

Set server-only `GEMINI_API_KEY`, `GEMINI_OCR_MODEL` (default
`gemini-3.5-flash-lite`) and explicitly set `GEMINI_OCR_ENABLED=true` to enable.
For real personnel documents, use a project configured for Google's Paid
Services with Cloud Billing; the Unpaid Services terms prohibit personal,
sensitive or confidential inputs: https://ai.google.dev/gemini-api/terms.
Enabling this may incur API charges. The app does not enable Billing for you.

Authenticated `GET /api/ocr/capabilities` returns availability and a cache
revision, never the API key. `POST /api/ocr/gemini-assist` accepts one bounded
image and its `ocrPage`. The server decides whether assistance is needed:
low confidence, partial/empty OCR, missing name/CCCD/birth date/gender on an identity
front, or printed expiry/gender labels without usable values. Good OCR skips
Google entirely. PDFs use the same page-image route, including cached pages.

Gemini receives the image and up to 20,000 characters of its local OCR text over
the Google API directly. There is no Files API upload. Requests use `store:false`,
a 30-second timeout and at most 4,096 output tokens. One call per weak page,
without automatic model switching or retries. A 429/503 opens a 60-second
cooldown. Only one provider call runs per server instance, with at most 20 calls
per account per ten minutes on that instance. These process-local limits are
not a distributed spending cap; configure provider quotas separately if needed.

Successful results have a five-minute in-memory, account-scoped hash cache
(50 entries maximum) and are also cached with the private intake draft. Missing
non-core fields retain local OCR values. Different names, CCCD numbers or birth
dates produce a review warning and preserve local OCR. Truncated/malformed
responses, provider errors and quota failures preserve local results too.
Gemini-assisted pages retain local OCR confidence (not a model confidence score),
mark the profile as `vision`, and always require human review. The “Quét lại”
button lets a user retry assistance using cached OCR without rereading good pages.

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

`vercel.json` includes the isolated worker, Tesseract worker/core, language
assets and Sharp native dependencies. Keep these files in the deployed function. Run the tests from the project
root, so worker paths resolve consistently with the server's existing convention.

`node --import tsx --test tests/ocr.test.ts` covers labeled Vietnamese fields,
conflicts, invalid dates, VNeID/SYLL separation, bounded image inputs, actual OCR
on a synthetic PNG, and concurrent-request limits. Orientation tests cover
candidate selection, incomplete identity pages and bounded retries. Batch tests
cover 10 employees, retry-only-failed and pausing. These tests do not guarantee
recognition accuracy or throughput for ten real multi-page dossiers.
