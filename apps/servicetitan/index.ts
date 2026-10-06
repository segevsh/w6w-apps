/**
 * ServiceTitan — the field-service platform for home and commercial trades:
 * customers, locations, leads, jobs, appointments and the people who run them,
 * over the ServiceTitan v2 REST API (`api.servicetitan.io`).
 *
 * Every path, verb, parameter, body field and enum here was verified on
 * 2026-10-06 against the OpenAPI 3.1 documents the developer portal serves for
 * the CRM, Job Planning & Management, Settings and Dispatch modules, plus live
 * unsigned probes of `api.servicetitan.io`, `api-integration.servicetitan.io`,
 * both `auth*.servicetitan.io` token hosts and `status.servicetitan.com`.
 *
 * The findings that shaped the design:
 *
 *  1. **The docs site looks empty over plain HTTP** — a 452-byte SPA shell for
 *     every path. The real specs are JSON at `/api/docs/apis/{apiId}`
 *     (`tenant-crm-v2`, `tenant-jpm-v2`, …), indexed by `/api/docs/apis`.
 *  2. **Two secrets on every call, plus a tenant in every path.** A bearer token
 *     alone is refused: `ST-App-Key` is also required (`lib/client.ts`,
 *     `auth/client-credentials.ts`), and every path embeds the numeric tenant id
 *     as `/{module}/v2/tenant/{tenantId}/…`.
 *  3. **Production and integration are different hosts and different
 *     credentials** — the environment selects both the API and the token host.
 *  4. **Creates demand more than you would guess**: a customer needs a location,
 *     a job needs its first appointment, a lead needs a campaign.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import appointmentList from "./actions/appointment-list.ts";
import businessUnitList from "./actions/business-unit-list.ts";
import customerCreate from "./actions/customer-create.ts";
import customerGet from "./actions/customer-get.ts";
import customerList from "./actions/customer-list.ts";
import customerUpdate from "./actions/customer-update.ts";
import employeeList from "./actions/employee-list.ts";
import jobCancel from "./actions/job-cancel.ts";
import jobCreate from "./actions/job-create.ts";
import jobGet from "./actions/job-get.ts";
import jobList from "./actions/job-list.ts";
import jobNoteCreate from "./actions/job-note-create.ts";
import leadCreate from "./actions/lead-create.ts";
import leadList from "./actions/lead-list.ts";
import locationCreate from "./actions/location-create.ts";
import locationList from "./actions/location-list.ts";
import technicianList from "./actions/technician-list.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    appointmentList,
    businessUnitList,
    customerCreate,
    customerGet,
    customerList,
    customerUpdate,
    employeeList,
    jobCancel,
    jobCreate,
    jobGet,
    jobList,
    jobNoteCreate,
    leadCreate,
    leadList,
    locationCreate,
    locationList,
    technicianList,
  ],
  auth: [clientCredentials],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
