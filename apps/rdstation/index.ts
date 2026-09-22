/**
 * RD Station CRM — the CRM v1 API App.
 *
 * RD Station (TOTVS, Brazil) ships two products with two separate APIs. This app
 * covers **RD Station CRM API v1** only: it authenticates with a per-user static
 * token in the query string, is self-serve (any CRM user can generate a token),
 * and is documented end to end in the vendor's own OpenAPI 3.1 reference. The
 * **Marketing API (RDSM)** is deliberately out of scope — its OAuth2 client
 * credentials come from RD Station's App Store partner programme, which cannot
 * be obtained or tested here. See `README.md`.
 *
 * Ten actions, one Auth method, and one declared health check — the `service`
 * feed probe below, alongside the `auth:api-key` check the host derives from the
 * Auth method's `test` hook for free. See `README.md`.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";

import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import listOrganizations from "./actions/list-organizations.ts";
import createOrganization from "./actions/create-organization.ts";
import listDeals from "./actions/list-deals.ts";
import createDeal from "./actions/create-deal.ts";
import listDealPipelines from "./actions/list-deal-pipelines.ts";
import listUsers from "./actions/list-users.ts";

export default {
  actions: [
    listContacts,
    getContact,
    createContact,
    updateContact,
    listOrganizations,
    createOrganization,
    listDeals,
    createDeal,
    listDealPipelines,
    listUsers,
  ],
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
