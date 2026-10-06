/**
 * Docparser — document parsing, over `api.docparser.com`.
 *
 * Every path, field and parameter was read off https://docparser.com/api/ on 2026-10-06 and
 * the unauthenticated error shape was probed live. Findings that shape the code:
 *
 *  1. **API versions are per route**: most are `/v1`, URL import and document status are `/v2`.
 *  2. **Bodies are form-encoded**, not JSON; arrays go as `document_ids[]`.
 *  3. **An invalid key is HTTP 403 `{"error":"api key not valid"}`** — classified from the body
 *     text. The probe is `GET /v1/ping`, answering `{"msg":"pong"}`, which carries no key.
 *  4. **Lists are bare arrays**, wrapped as `{items, count}`.
 *  5. **The status page is Statuspage** and has a component named "HTTP REST API", which is pinned.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import ping from "./actions/ping.ts";
import parserList from "./actions/parser-list.ts";
import parserModelList from "./actions/parser-model-list.ts";
import documentImportUrl from "./actions/document-import-url.ts";
import documentUploadContent from "./actions/document-upload-content.ts";
import documentStatusGet from "./actions/document-status-get.ts";
import resultsGet from "./actions/results-get.ts";
import resultsList from "./actions/results-list.ts";
import documentReparse from "./actions/document-reparse.ts";
import documentReintegrate from "./actions/document-reintegrate.ts";

import service from "./health/service.ts";

export default {
  actions: [
    ping,
    parserList,
    parserModelList,
    documentImportUrl,
    documentUploadContent,
    documentStatusGet,
    resultsGet,
    resultsList,
    documentReparse,
    documentReintegrate,
  ],
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
