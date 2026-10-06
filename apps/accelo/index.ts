/**
 * Accelo — w6w app, built from Accelo's own public API reference
 * (https://api.accelo.com/docs/, a single static Slate page that IS the spec;
 * read in full 2026-10-06). The catalog's older link to affinitylive.jira.com is
 * stale. Base URL, auth, every path, every writable field and the paging
 * parameters in this app were taken from that page, and the hostnames, the
 * token and error shapes were confirmed on the wire without credentials.
 *
 * What shapes this app is that **every customer has its own host** —
 * `{deployment}.api.accelo.com`. A static manifest cannot enumerate those, so:
 *
 *   - `w6w.network.allow` declares `*.api.accelo.com`; the runtime matches any
 *     subdomain of it and refuses everything else;
 *   - the deployment is an Auth field, not an Action param. `afterConnect`
 *     records it on the connection's redacted display data, and `lib/client.ts`
 *     reads it from there, so no Action ever sees a credential.
 *
 * Auth is the documented **Service Application** (OAuth 2 client credentials,
 * HTTP Basic to the token endpoint). Web and Installed applications use the
 * authorization-code grant against the customer's own host, which a static
 * `oauth2` auth cannot address, so they are not built.
 *
 * Covered: companies, contacts, activities (incl. time), tasks, jobs, issues,
 * requests, prospects, invoices and staff. Deliberately absent, and named in the
 * README: deletes, affiliations, contracts, quotes, expenses, payments, assets,
 * profile and extension (custom) field values, progressions, webhooks, and file
 * attachments.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import activityCreate from "./actions/activity-create.ts";
import activityGet from "./actions/activity-get.ts";
import activityList from "./actions/activity-list.ts";
import companyCreate from "./actions/company-create.ts";
import companyGet from "./actions/company-get.ts";
import companyList from "./actions/company-list.ts";
import companyUpdate from "./actions/company-update.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceList from "./actions/invoice-list.ts";
import issueCreate from "./actions/issue-create.ts";
import issueGet from "./actions/issue-get.ts";
import issueList from "./actions/issue-list.ts";
import issueUpdate from "./actions/issue-update.ts";
import jobCreate from "./actions/job-create.ts";
import jobGet from "./actions/job-get.ts";
import jobList from "./actions/job-list.ts";
import jobUpdate from "./actions/job-update.ts";
import prospectCreate from "./actions/prospect-create.ts";
import prospectGet from "./actions/prospect-get.ts";
import prospectList from "./actions/prospect-list.ts";
import prospectUpdate from "./actions/prospect-update.ts";
import requestCreate from "./actions/request-create.ts";
import requestGet from "./actions/request-get.ts";
import requestList from "./actions/request-list.ts";
import staffGet from "./actions/staff-get.ts";
import staffList from "./actions/staff-list.ts";
import taskCreate from "./actions/task-create.ts";
import taskGet from "./actions/task-get.ts";
import taskList from "./actions/task-list.ts";
import taskUpdate from "./actions/task-update.ts";

import service from "./health/service.ts";
import deployment from "./health/deployment.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // company
    companyCreate,
    companyGet,
    companyList,
    companyUpdate,
    // contact
    contactCreate,
    contactGet,
    contactList,
    contactUpdate,
    // activity
    activityCreate,
    activityGet,
    activityList,
    // task
    taskCreate,
    taskGet,
    taskList,
    taskUpdate,
    // job
    jobCreate,
    jobGet,
    jobList,
    jobUpdate,
    // issue
    issueCreate,
    issueGet,
    issueList,
    issueUpdate,
    // request
    requestCreate,
    requestGet,
    requestList,
    // prospect
    prospectCreate,
    prospectGet,
    prospectList,
    prospectUpdate,
    // invoice
    invoiceGet,
    invoiceList,
    // staff
    staffGet,
    staffList,
  ],
  auth: [clientCredentials],
  healthChecks: [service, deployment, quota],
} satisfies AppDefinition;
