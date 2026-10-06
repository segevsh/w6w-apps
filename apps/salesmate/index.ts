/**
 * Salesmate (sales CRM), built against the **v4** API only.
 *
 * Each account has its own host (`acme.salesmate.io`, API under `/apis`), and
 * every request carries two headers: `accessToken` (the user's token) and
 * `x-linkname` (the account host) — see `auth/access-token.ts`. Responses are
 * wrapped in `{ Status: "success", Data }` / `{ Status: "failure", Error }`,
 * which `lib/client.ts` unwraps.
 *
 * Deliberately absent (the reference documents them only on v1/v3 — deprecated
 * per its own banner — or under-specifies them): Products, lookup-field
 * association, custom-module records, note attachments and bulk deletes. See
 * the README.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";
import activityCreate from "./actions/activity-create.ts";
import activityDelete from "./actions/activity-delete.ts";
import activityGet from "./actions/activity-get.ts";
import activitySearch from "./actions/activity-search.ts";
import activityUpdate from "./actions/activity-update.ts";
import companyCreate from "./actions/company-create.ts";
import companyDelete from "./actions/company-delete.ts";
import companyGet from "./actions/company-get.ts";
import companySearch from "./actions/company-search.ts";
import companyUpdate from "./actions/company-update.ts";
import contactCreate from "./actions/contact-create.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactGet from "./actions/contact-get.ts";
import contactSearch from "./actions/contact-search.ts";
import contactUpdate from "./actions/contact-update.ts";
import dealCreate from "./actions/deal-create.ts";
import dealDelete from "./actions/deal-delete.ts";
import dealGet from "./actions/deal-get.ts";
import dealSearch from "./actions/deal-search.ts";
import dealUpdate from "./actions/deal-update.ts";
import noteCreate from "./actions/note-create.ts";
import noteDelete from "./actions/note-delete.ts";
import noteGet from "./actions/note-get.ts";
import noteGetMany from "./actions/note-get-many.ts";
import notePin from "./actions/note-pin.ts";
import noteUnpin from "./actions/note-unpin.ts";
import noteUpdate from "./actions/note-update.ts";
import userGetMany from "./actions/user-get-many.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import domain from "./health/domain.ts";

export default {
  actions: [
    activityCreate,
    activityDelete,
    activityGet,
    activitySearch,
    activityUpdate,
    companyCreate,
    companyDelete,
    companyGet,
    companySearch,
    companyUpdate,
    contactCreate,
    contactDelete,
    contactGet,
    contactSearch,
    contactUpdate,
    dealCreate,
    dealDelete,
    dealGet,
    dealSearch,
    dealUpdate,
    noteCreate,
    noteDelete,
    noteGet,
    noteGetMany,
    notePin,
    noteUnpin,
    noteUpdate,
    userGetMany,
  ],
  auth: [accessToken],
  healthChecks: [service, quota, domain],
} satisfies AppDefinition;
