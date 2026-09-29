/**
 * Redtail CRM — a CRM built for financial advisors. A Contact (person,
 * business, trust, association or union) sits at the center, with addresses
 * and notes hung off it, activities (tasks, appointments, calls) optionally
 * linked to it, and opportunities running it through a sales pipeline.
 *
 * See `lib/client.ts` for how the base URL and the two-step auth exchange
 * were verified against Redtail's own Postman collection ("TWAPI
 * Documentation"), and `auth/database-credentials.ts` for the exchange
 * itself. Every endpoint below is covered by that same collection — no
 * endpoint here was inferred or guessed.
 */
import type { AppDefinition } from "@w6w/types";
import databaseCredentials from "./auth/database-credentials.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactSearch from "./actions/contact-search.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import contactAddressList from "./actions/contact-address-list.ts";
import contactAddressCreate from "./actions/contact-address-create.ts";
import contactAddressUpdate from "./actions/contact-address-update.ts";
import contactAddressDelete from "./actions/contact-address-delete.ts";

import noteList from "./actions/note-list.ts";
import noteCreate from "./actions/note-create.ts";
import noteDelete from "./actions/note-delete.ts";

import activityList from "./actions/activity-list.ts";
import activityGet from "./actions/activity-get.ts";
import activityCreate from "./actions/activity-create.ts";
import activityUpdate from "./actions/activity-update.ts";
import activityDelete from "./actions/activity-delete.ts";

import opportunityList from "./actions/opportunity-list.ts";
import opportunityGet from "./actions/opportunity-get.ts";
import opportunityCreate from "./actions/opportunity-create.ts";
import opportunityUpdate from "./actions/opportunity-update.ts";
import opportunityDelete from "./actions/opportunity-delete.ts";

import databaseUserList from "./actions/database-user-list.ts";
import opportunityStageList from "./actions/opportunity-stage-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    contactList,
    contactGet,
    contactSearch,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactAddressList,
    contactAddressCreate,
    contactAddressUpdate,
    contactAddressDelete,
    noteList,
    noteCreate,
    noteDelete,
    activityList,
    activityGet,
    activityCreate,
    activityUpdate,
    activityDelete,
    opportunityList,
    opportunityGet,
    opportunityCreate,
    opportunityUpdate,
    opportunityDelete,
    databaseUserList,
    opportunityStageList,
  ],
  auth: [databaseCredentials],
  healthChecks: [service, quota],
} satisfies AppDefinition;
