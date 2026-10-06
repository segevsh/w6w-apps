/**
 * DocuMerge — document generation (documerge.ai). Builds documents (merge templates), routes
 * (document packs), their fields and delivery methods, queues merges, and runs the PDF tools,
 * over the REST API at `app.documerge.ai`.
 *
 * Every path, verb and body field was verified on 2026-10-06 against
 * https://app.documerge.ai/api-docs/openapi.yaml (and the Postman collection beside it), plus
 * live probes of `app.documerge.ai`. The reference was last regenerated March 2024.
 *
 * Findings that shaped the design:
 *
 *  1. **A missing and a wrong token answer identically**: `401 {"message":"Unauthenticated."}`
 *     (`auth/api-token.ts`). The verdict is taken from that body; the unsigned `api` health
 *     check treats it as a pass.
 *  2. **A merge is addressed by the document's `key`**, not its numeric id, and is queued
 *     (`Document merge queued!`, answered as text/plain). Results go to delivery methods.
 *     The reference documents no request body for it; `data` is passed through verbatim.
 *  3. **The `/api/tools/*` endpoints answer the produced file as bytes**, so those actions
 *     return it base64-encoded.
 */
import type { AppDefinition } from "@w6w/types";

import apiToken from "./auth/api-token.ts";

import api from "./health/api.ts";
import service from "./health/service.ts";

import documentCopy from "./actions/document-copy.ts";
import documentCreate from "./actions/document-create.ts";
import documentDelete from "./actions/document-delete.ts";
import documentDeliveryMethodCreate from "./actions/document-delivery-method-create.ts";
import documentDeliveryMethodDelete from "./actions/document-delivery-method-delete.ts";
import documentDeliveryMethodList from "./actions/document-delivery-method-list.ts";
import documentDeliveryMethodUpdate from "./actions/document-delivery-method-update.ts";
import documentFieldCreate from "./actions/document-field-create.ts";
import documentFieldDelete from "./actions/document-field-delete.ts";
import documentFieldList from "./actions/document-field-list.ts";
import documentFieldUpdate from "./actions/document-field-update.ts";
import documentFileGet from "./actions/document-file-get.ts";
import documentGet from "./actions/document-get.ts";
import documentList from "./actions/document-list.ts";
import documentMerge from "./actions/document-merge.ts";
import documentUpdate from "./actions/document-update.ts";
import routeCreate from "./actions/route-create.ts";
import routeDelete from "./actions/route-delete.ts";
import routeDeliveryMethodCreate from "./actions/route-delivery-method-create.ts";
import routeDeliveryMethodDelete from "./actions/route-delivery-method-delete.ts";
import routeDeliveryMethodList from "./actions/route-delivery-method-list.ts";
import routeDeliveryMethodUpdate from "./actions/route-delivery-method-update.ts";
import routeFieldCreate from "./actions/route-field-create.ts";
import routeFieldDelete from "./actions/route-field-delete.ts";
import routeFieldList from "./actions/route-field-list.ts";
import routeFieldUpdate from "./actions/route-field-update.ts";
import routeGet from "./actions/route-get.ts";
import routeList from "./actions/route-list.ts";
import routeMerge from "./actions/route-merge.ts";
import routeRuleList from "./actions/route-rule-list.ts";
import routeUpdate from "./actions/route-update.ts";
import toolCombine from "./actions/tool-combine.ts";
import toolPdfCompress from "./actions/tool-pdf-compress.ts";
import toolPdfConvert from "./actions/tool-pdf-convert.ts";
import toolPdfEncrypt from "./actions/tool-pdf-encrypt.ts";
import toolPdfSplit from "./actions/tool-pdf-split.ts";

const app: AppDefinition = {
  actions: [
    documentCopy,
    documentCreate,
    documentDelete,
    documentDeliveryMethodCreate,
    documentDeliveryMethodDelete,
    documentDeliveryMethodList,
    documentDeliveryMethodUpdate,
    documentFieldCreate,
    documentFieldDelete,
    documentFieldList,
    documentFieldUpdate,
    documentFileGet,
    documentGet,
    documentList,
    documentMerge,
    documentUpdate,
    routeCreate,
    routeDelete,
    routeDeliveryMethodCreate,
    routeDeliveryMethodDelete,
    routeDeliveryMethodList,
    routeDeliveryMethodUpdate,
    routeFieldCreate,
    routeFieldDelete,
    routeFieldList,
    routeFieldUpdate,
    routeGet,
    routeList,
    routeMerge,
    routeRuleList,
    routeUpdate,
    toolCombine,
    toolPdfCompress,
    toolPdfConvert,
    toolPdfEncrypt,
    toolPdfSplit,
  ],
  auth: [apiToken],
  healthChecks: [api, service],
};

export default app;
