/**
 * Formstack Documents (formerly WebMerge) — document generation: templates,
 * merges, data routes, deliveries and PDF tools, on the REST API at
 * `https://www.webmerge.me/api`.
 *
 * Verified 2026-10-06 against `www.webmerge.me/developers` (Overview,
 * Authentication, Documents, Data Routes, Tools) — an HTML reference with no
 * OpenAPI document, so nothing here came from a third-party directory.
 *
 * What would cost someone a day:
 *
 *  1. **The merge URLs are not under `/api`** (`lib/client.ts`). Merging is
 *     `POST /merge/<id>/<key>` and `/route/<id>/<key>`, while everything else is
 *     `/api/...`. The merge endpoints also need the document's own *key*, which
 *     is separate from the API credential — merge actions look it up if omitted.
 *  2. **One endpoint, two body shapes** (`lib/client.ts`). `download=1` returns
 *     raw PDF bytes; without it `{"success":1}`; a route merge of two or more
 *     documents returns a JSON envelope of base64 files instead. Files are
 *     returned base64-encoded under `file`.
 *  3. **A rejected credential is a bare 401 with an empty body**
 *     (`auth/api-key.ts`) — the status is the only signal, so the probe also
 *     requires a JSON array on success.
 *  4. **The status page belongs to Intellistack** (`health/service.ts`) and is a
 *     portfolio page; only the "Formstack Documents" component group is read.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import documentList from "./actions/document-list.ts";
import documentGet from "./actions/document-get.ts";
import documentCreate from "./actions/document-create.ts";
import documentUpdate from "./actions/document-update.ts";
import documentCopy from "./actions/document-copy.ts";
import documentDelete from "./actions/document-delete.ts";
import documentFieldsGet from "./actions/document-fields-get.ts";
import documentFileGet from "./actions/document-file-get.ts";
import documentDeliveryList from "./actions/document-delivery-list.ts";
import documentDeliveryCreate from "./actions/document-delivery-create.ts";
import documentMerge from "./actions/document-merge.ts";

import routeList from "./actions/route-list.ts";
import routeGet from "./actions/route-get.ts";
import routeCreate from "./actions/route-create.ts";
import routeUpdate from "./actions/route-update.ts";
import routeDelete from "./actions/route-delete.ts";
import routeFieldsGet from "./actions/route-fields-get.ts";
import routeRulesGet from "./actions/route-rules-get.ts";
import routeDeliveryList from "./actions/route-delivery-list.ts";
import routeDeliveryCreate from "./actions/route-delivery-create.ts";
import routeMerge from "./actions/route-merge.ts";

import fileCombine from "./actions/file-combine.ts";
import fileConvertToPdf from "./actions/file-convert-to-pdf.ts";
import pdfCompress from "./actions/pdf-compress.ts";
import pdfEncrypt from "./actions/pdf-encrypt.ts";
import pdfSplit from "./actions/pdf-split.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    documentList,
    documentGet,
    documentCreate,
    documentUpdate,
    documentCopy,
    documentDelete,
    documentFieldsGet,
    documentFileGet,
    documentDeliveryList,
    documentDeliveryCreate,
    documentMerge,
    routeList,
    routeGet,
    routeCreate,
    routeUpdate,
    routeDelete,
    routeFieldsGet,
    routeRulesGet,
    routeDeliveryList,
    routeDeliveryCreate,
    routeMerge,
    fileCombine,
    fileConvertToPdf,
    pdfCompress,
    pdfEncrypt,
    pdfSplit,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
