/**
 * Drata — compliance automation (GRC): workspaces, controls, monitoring tests,
 * evidence, personnel, vendors, risks, policies, devices and assets, over the
 * Drata Public API v2.
 *
 * Every path, verb, query parameter, body field and enum in this app was verified
 * on 2026-10-05 against Drata's own OpenAPI document (served inside the developer
 * portal's overview page; the old `public-api.drata.com/public/openapi.json`
 * answers 401) plus live probes of `status.drata.com`.
 *
 * The findings that shaped the design:
 *
 *  1. **Three regional hosts** (`lib/client.ts`). A key authenticates only on its
 *     own region's host — US, EU or APAC — and the wrong one answers 401, which
 *     reads as a bad key. Region is a fixed-allowlist connect-time field, stored
 *     on the Connection by `afterConnect`.
 *  2. **412 means "accept the terms in the web app"** (`lib/client.ts`). Beyond
 *     401/403, the documented 412 is returned until the API key owner has accepted
 *     Drata's terms and conditions — a valid, correctly permissioned key fails
 *     every call until then.
 *  3. **The current evidence API is `/evidence`, not `/evidence-library`**
 *     (`actions/evidence-create.ts`). The older endpoint is marked superseded in
 *     its own description, and files go through a separate pre-upload step.
 *  4. **`contactEmail` on create, `contactsEmail` on update** (`actions/vendor-create.ts`).
 *  5. **Cursor pagination, lean payloads** (`lib/params.ts`). Related objects come
 *     only with `expand[]`, and every list returns `{ items, nextCursor }`.
 *  6. **500 requests/minute per IP, no headers** (`health/quota.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import companyGet from "./actions/company-get.ts";
import workspaceList from "./actions/workspace-list.ts";
import userList from "./actions/user-list.ts";
import personnelList from "./actions/personnel-list.ts";
import personnelGet from "./actions/personnel-get.ts";
import controlList from "./actions/control-list.ts";
import controlGet from "./actions/control-get.ts";
import monitoringTestList from "./actions/monitoring-test-list.ts";
import monitoringTestGet from "./actions/monitoring-test-get.ts";
import monitoringTestFailuresList from "./actions/monitoring-test-failures-list.ts";
import evidenceList from "./actions/evidence-list.ts";
import evidenceGet from "./actions/evidence-get.ts";
import evidenceCreate from "./actions/evidence-create.ts";
import evidenceFileUpload from "./actions/evidence-file-upload.ts";
import vendorList from "./actions/vendor-list.ts";
import vendorGet from "./actions/vendor-get.ts";
import vendorCreate from "./actions/vendor-create.ts";
import vendorUpdate from "./actions/vendor-update.ts";
import riskRegisterList from "./actions/risk-register-list.ts";
import riskList from "./actions/risk-list.ts";
import riskGet from "./actions/risk-get.ts";
import riskCreate from "./actions/risk-create.ts";
import policyList from "./actions/policy-list.ts";
import policyGet from "./actions/policy-get.ts";
import deviceList from "./actions/device-list.ts";
import assetList from "./actions/asset-list.ts";
import eventList from "./actions/event-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account
    companyGet,
    workspaceList,
    // People
    userList,
    personnelList,
    personnelGet,
    // Controls & monitoring
    controlList,
    controlGet,
    monitoringTestList,
    monitoringTestGet,
    monitoringTestFailuresList,
    // Evidence
    evidenceList,
    evidenceGet,
    evidenceCreate,
    evidenceFileUpload,
    // Vendors
    vendorList,
    vendorGet,
    vendorCreate,
    vendorUpdate,
    // Risk
    riskRegisterList,
    riskList,
    riskGet,
    riskCreate,
    // Policies, devices, assets, events
    policyList,
    policyGet,
    deviceList,
    assetList,
    eventList,
  ],
  // API key only: Drata's one security scheme is `bearer` (bearerFormat API_KEY).
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
