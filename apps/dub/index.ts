import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import linkCreate from "./actions/link-create.ts";
import linkUpdate from "./actions/link-update.ts";
import linkUpsert from "./actions/link-upsert.ts";
import linkDelete from "./actions/link-delete.ts";
import linkGet from "./actions/link-get.ts";
import linkList from "./actions/link-list.ts";
import linkCount from "./actions/link-count.ts";
import linkBulkCreate from "./actions/link-bulk-create.ts";
import linkBulkUpdate from "./actions/link-bulk-update.ts";
import linkBulkDelete from "./actions/link-bulk-delete.ts";
import domainCreate from "./actions/domain-create.ts";
import domainUpdate from "./actions/domain-update.ts";
import domainDelete from "./actions/domain-delete.ts";
import domainCheckAvailability from "./actions/domain-check-availability.ts";
import folderList from "./actions/folder-list.ts";
import folderCreate from "./actions/folder-create.ts";
import folderUpdate from "./actions/folder-update.ts";
import folderDelete from "./actions/folder-delete.ts";
import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagUpdate from "./actions/tag-update.ts";
import analyticsGet from "./actions/analytics-get.ts";
import eventList from "./actions/event-list.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import trackLead from "./actions/track-lead.ts";
import trackSale from "./actions/track-sale.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Dub — links, domains, folders, tags, analytics, events, customers and
 * conversion tracking, built from the per-endpoint OpenAPI documents embedded
 * in dub.co/docs/api-reference. Partner-program endpoints (partners,
 * applications, bounties, commissions, payouts, discount codes) are not
 * covered; see the README.
 */
export default {
  actions: [
    // Links
    linkCreate,
    linkUpdate,
    linkUpsert,
    linkDelete,
    linkGet,
    linkList,
    linkCount,
    linkBulkCreate,
    linkBulkUpdate,
    linkBulkDelete,
    // Domains
    domainCreate,
    domainUpdate,
    domainDelete,
    domainCheckAvailability,
    // Folders
    folderList,
    folderCreate,
    folderUpdate,
    folderDelete,
    // Tags
    tagList,
    tagCreate,
    tagUpdate,
    // Analytics and events
    analyticsGet,
    eventList,
    // Customers
    customerList,
    customerGet,
    customerUpdate,
    customerDelete,
    // Conversion tracking
    trackLead,
    trackSale,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
