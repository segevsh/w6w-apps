/**
 * Refiner — in-product NPS and CSAT surveys (refiner.io). Reads responses and
 * reports, manages surveys, contacts and segments, and pushes user traits and
 * events, over the Refiner REST API v1 (`api.refiner.io`).
 *
 * Every path, verb and parameter was verified on 2026-10-06 against
 * https://refiner.io/docs/api/ plus live probes of `api.refiner.io`.
 *
 * Findings that shaped the design:
 *
 *  1. **A bad key is answered three ways** (`auth/api-key.ts`): a missing key is
 *     `401 {"error":"No API key found in headers"}`, a malformed one
 *     `401 {"error":"API key does not look valid"}`, and a well-formed unknown
 *     one is a **404** with a `message` field (not `error`). Classified by body.
 *  2. **A short key is reported as "missing"**, not "invalid", so a placeholder
 *     key sent in the right header still says "No API key found".
 *  3. **Two list-pagination modes**: page numbers, and `next_page_cursor`, which
 *     the vendor recommends past ~10,000 rows (`page_length` max 1000).
 *  4. **Filters use bracket syntax** (`response_data[nps]=9`, `form_uuids[]=…`),
 *     which `lib/client.ts` builds from plain objects and arrays.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

import accountGet from "./actions/account-get.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactIdentify from "./actions/contact-identify.ts";
import contactList from "./actions/contact-list.ts";
import eventTrack from "./actions/event-track.ts";
import formArchive from "./actions/form-archive.ts";
import formDuplicate from "./actions/form-duplicate.ts";
import formHistory from "./actions/form-history.ts";
import formList from "./actions/form-list.ts";
import formPublish from "./actions/form-publish.ts";
import projectGet from "./actions/project-get.ts";
import reportGet from "./actions/report-get.ts";
import responseList from "./actions/response-list.ts";
import responseStore from "./actions/response-store.ts";
import responseTag from "./actions/response-tag.ts";
import segmentAddContact from "./actions/segment-add-contact.ts";
import segmentList from "./actions/segment-list.ts";
import segmentRemoveContact from "./actions/segment-remove-contact.ts";

const app: AppDefinition = {
  actions: [
    accountGet,
    contactDelete,
    contactGet,
    contactIdentify,
    contactList,
    eventTrack,
    formArchive,
    formDuplicate,
    formHistory,
    formList,
    formPublish,
    projectGet,
    reportGet,
    responseList,
    responseStore,
    responseTag,
    segmentAddContact,
    segmentList,
    segmentRemoveContact,
  ],
  auth: [apiKey],
  healthChecks: [api, service, quota],
};

export default app;
