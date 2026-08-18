/**
 * Deel — contracts, people, time off, timesheets and the money that rides on
 * them.
 *
 * Every path, parameter, required body field and response shape was taken from
 * the OpenAPI documents Deel serves from its own developer host.
 * `https://developer.deel.com/openapi.json` is an **index** of twelve of them;
 * this app was built from four, fetched 2026-08-18:
 *
 *   - `openapi/ic-endpoints.json`   — contracts, milestones, timesheets,
 *                                     invoice adjustments (29 paths)
 *   - `openapi/hris-endpoints.json` — people, time off, org structures
 *                                     (47 paths)
 *   - `openapi/endpoints.json`      — webhooks, lookups, legal entities
 *                                     (34 paths)
 *   - `openapi/endpoints-3.json`    — adjustments, global payroll, time
 *                                     tracking (27 paths)
 *
 * Three things about this API shape the app:
 *
 *   - **Two pagination contracts.** Contracts, timesheets, adjustments and
 *     webhooks page by **cursor** (`page.cursor` → `after_cursor`); the HRIS
 *     collections page by **offset**. Sending a cursor to an offset endpoint is
 *     silently ignored and returns page one forever, so `lib/client.ts` keeps
 *     the two apart and each action uses the one its endpoint declares.
 *   - **Writes take a `data` envelope.** Deel wraps write bodies as
 *     `{data: {...}}`; a bare attribute object is rejected.
 *   - **Two environments, and tokens are not shared.** The documents name
 *     `api.letsdeel.com` and `api-staging.letsdeel.com`. Which one a Connection
 *     talks to is a field, not a guess.
 *
 * One thing deliberately ignored: several operations declare `Authorization`
 * as a *required header parameter* alongside the document's own `deelToken`
 * security scheme. Copying that into an action's params would put a credential
 * in a form field, which the sandbox forbids — the `sign` hook supplies it.
 *
 * Deliberately out of scope, and each is its own document in that index:
 *   - **EOR and Global Payroll worker administration** (`eor-endpoints-2`,
 *     `endpoints-3`'s `/gp/workers/*`): addresses, bank accounts, compensation,
 *     terminations, payslips. Employment-record changes with legal weight,
 *     which deserve their own app rather than a sample here.
 *   - **The ATS** (`ats-endpoints`, and the 338-path `endpoints-5`):
 *     candidates, applications, interviews, job postings. A whole product.
 *   - **Immigration, screening (KYC/AML) and IT asset management** —
 *     compliance and device surfaces with their own vocabularies.
 *   - **SCIM user provisioning** (`/Users`, on its own `scim/v2` server) —
 *     directory sync, not workflow automation.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import contractList from "./actions/contract-list.ts";
import contractGet from "./actions/contract-get.ts";
import contractTerminate from "./actions/contract-terminate.ts";
import contractMilestoneList from "./actions/contract-milestone-list.ts";
import contractMilestoneCreate from "./actions/contract-milestone-create.ts";
import personList from "./actions/person-list.ts";
import personGet from "./actions/person-get.ts";
import personPersonalInfoGet from "./actions/person-personal-info-get.ts";
import personDepartmentUpdate from "./actions/person-department-update.ts";
import timeOffList from "./actions/time-off-list.ts";
import timeOffCreate from "./actions/time-off-create.ts";
import timeOffReview from "./actions/time-off-review.ts";
import timeOffDelete from "./actions/time-off-delete.ts";
import timeOffEntitlementList from "./actions/time-off-entitlement-list.ts";
import timesheetList from "./actions/timesheet-list.ts";
import timesheetCreate from "./actions/timesheet-create.ts";
import invoiceAdjustmentList from "./actions/invoice-adjustment-list.ts";
import invoiceAdjustmentCreate from "./actions/invoice-adjustment-create.ts";
import adjustmentCategoryList from "./actions/adjustment-category-list.ts";
import legalEntityList from "./actions/legal-entity-list.ts";
import lookupList from "./actions/lookup-list.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookEventList from "./actions/webhook-event-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // contract
    contractList,
    contractGet,
    contractTerminate,
    contractMilestoneList,
    contractMilestoneCreate,
    // people
    personList,
    personGet,
    personPersonalInfoGet,
    personDepartmentUpdate,
    // time off
    timeOffList,
    timeOffCreate,
    timeOffReview,
    timeOffDelete,
    timeOffEntitlementList,
    // timesheet
    timesheetList,
    timesheetCreate,
    // money
    invoiceAdjustmentList,
    invoiceAdjustmentCreate,
    adjustmentCategoryList,
    // reference data
    legalEntityList,
    lookupList,
    // webhook
    webhookList,
    webhookCreate,
    webhookDelete,
    webhookEventList,
  ],
  auth: [apiToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
