/**
 * Pipedrive — w6w port of n8n's `Pipedrive` node.
 *
 * A REST CRM. Every response comes wrapped in a `{ success, data,
 * additional_data }` envelope (see `lib/client.ts`), and the two auth methods
 * sign differently: the personal API token rides as an `api_token` query param,
 * while OAuth2 uses a `Bearer` header — both against the same
 * `api.pipedrive.com/v1` base.
 *
 * Deliberately absent: the webhook trigger (a Trigger, not an Action), file
 * upload/download (a binary-stream surface), and the per-resource search
 * endpoints — kept out to hold the action count to the most-used
 * create/read/update/delete operations across the six core resources.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";
import oauth2 from "./auth/oauth2.ts";

import dealCreate from "./actions/deal-create.ts";
import dealGet from "./actions/deal-get.ts";
import dealGetMany from "./actions/deal-get-many.ts";
import dealUpdate from "./actions/deal-update.ts";
import dealDelete from "./actions/deal-delete.ts";
import personCreate from "./actions/person-create.ts";
import personGetMany from "./actions/person-get-many.ts";
import personUpdate from "./actions/person-update.ts";
import personDelete from "./actions/person-delete.ts";
import organizationCreate from "./actions/organization-create.ts";
import organizationGetMany from "./actions/organization-get-many.ts";
import activityCreate from "./actions/activity-create.ts";
import noteCreate from "./actions/note-create.ts";
import leadCreate from "./actions/lead-create.ts";
import newDeal from "./triggers/new-deal.ts";
import newPerson from "./triggers/new-person.ts";
import personUpdated from "./triggers/person-updated.ts";
import personDeleted from "./triggers/person-deleted.ts";
import newOrganization from "./triggers/new-organization.ts";
import organizationUpdated from "./triggers/organization-updated.ts";
import organizationDeleted from "./triggers/organization-deleted.ts";
import dealUpdated from "./triggers/deal-updated.ts";
import dealDeleted from "./triggers/deal-deleted.ts";
import newActivity from "./triggers/new-activity.ts";
import newNote from "./triggers/new-note.ts";
import newLead from "./triggers/new-lead.ts";
import anyEvent from "./triggers/any-event.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // deal
    dealCreate,
    dealGet,
    dealGetMany,
    dealUpdate,
    dealDelete,
    // person
    personCreate,
    personGetMany,
    personUpdate,
    personDelete,
    // organization
    organizationCreate,
    organizationGetMany,
    // activity
    activityCreate,
    // note
    noteCreate,
    // lead
    leadCreate,
  ],
  auth: [apiToken, oauth2],
  triggers: [
    newDeal,
    newPerson,
    personUpdated,
    personDeleted,
    newOrganization,
    organizationUpdated,
    organizationDeleted,
    dealUpdated,
    dealDeleted,
    newActivity,
    newNote,
    newLead,
    anyEvent,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
