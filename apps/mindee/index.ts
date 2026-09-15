/**
 * Mindee — document/OCR AI extraction, over the Platform V2 API
 * (`api-v2.mindee.net`).
 *
 * Every path, verb, form field, response shape and error code in this app was
 * verified on 2026-09-15 against Mindee's own OpenAPI 3.1 document
 * (`api-v2.mindee.net/openapi.json`, linked from
 * `docs.mindee.com/integrations/api-reference`, `info.version` `2.0.0`), the
 * official `mindee-api-python` SDK source (`github.com/mindee/mindee-api-python`),
 * plus live probes against `api-v2.mindee.net` and `status.mindee.com`.
 * Nothing here came from a third-party integration directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The wire auth format contradicts the naive reading of the OpenAPI
 *     security scheme** (`auth/api-key.ts`, `lib/client.ts`). The scheme says
 *     `apiKey` in the `Authorization` header, which most APIs pair with a
 *     `Bearer ` prefix — Mindee's does not. Sending one gets a distinct 401
 *     (`401-009`) rather than being silently accepted or ignored.
 *  2. **One route's `requestBody` is missing from the live `openapi.json`**
 *     (`actions/ocr-enqueue.ts`): `POST /v2/products/ocr/enqueue`. Confirmed
 *     as a spec-export gap rather than a different shape, via the same
 *     vendor's own per-page doc snippet, which names the identical
 *     `UtilityEnqueueForm` schema Classification/Crop/Split declare.
 *  3. **Every inference is asynchronous and enqueue answers a Job, never
 *     data** (`lib/enqueue.ts`, `actions/job-status-get.ts`). A workflow
 *     polls `job-status-get` (or configures a webhook on the Platform — the
 *     API has no webhook-management route, only a `webhook_ids` reference) and
 *     then calls the matching product's `*-result-get` with the SAME id the
 *     enqueued job returned.
 *
 * Five inference products share the asynchronous enqueue → poll → result
 * shape: Extraction (a data schema you define), Classification, Crop, OCR
 * (raw text + word positions) and Split. Extraction alone carries extra
 * enqueue options (raw text, polygons, confidence, RAG, text/data-schema
 * overrides) and its own RAG-document management surface. Model Search is
 * where a workflow finds the model IDs every enqueue action needs.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import extractionEnqueue from "./actions/extraction-enqueue.ts";
import extractionResultGet from "./actions/extraction-result-get.ts";
import classificationEnqueue from "./actions/classification-enqueue.ts";
import classificationResultGet from "./actions/classification-result-get.ts";
import cropEnqueue from "./actions/crop-enqueue.ts";
import cropResultGet from "./actions/crop-result-get.ts";
import ocrEnqueue from "./actions/ocr-enqueue.ts";
import ocrResultGet from "./actions/ocr-result-get.ts";
import splitEnqueue from "./actions/split-enqueue.ts";
import splitResultGet from "./actions/split-result-get.ts";

import jobStatusGet from "./actions/job-status-get.ts";
import modelSearch from "./actions/model-search.ts";

import ragDocumentUpload from "./actions/rag-document-upload.ts";
import ragDocumentGet from "./actions/rag-document-get.ts";
import ragDocumentUpdate from "./actions/rag-document-update.ts";
import ragDocumentSearch from "./actions/rag-document-search.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Extraction
    extractionEnqueue,
    extractionResultGet,
    // Classification
    classificationEnqueue,
    classificationResultGet,
    // Crop
    cropEnqueue,
    cropResultGet,
    // OCR
    ocrEnqueue,
    ocrResultGet,
    // Split
    splitEnqueue,
    splitResultGet,
    // Polling & discovery
    jobStatusGet,
    modelSearch,
    // RAG documents (extraction only)
    ragDocumentUpload,
    ragDocumentGet,
    ragDocumentUpdate,
    ragDocumentSearch,
  ],
  // API key only. Mindee's V2 Platform publishes no OAuth surface — a
  // long-lived, manually-managed key is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
