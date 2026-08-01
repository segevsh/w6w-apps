import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";

import listDeals from "./actions/list-deals.ts";
import getDeal from "./actions/get-deal.ts";
import createDeal from "./actions/create-deal.ts";

import listCampaigns from "./actions/list-campaigns.ts";
import getCampaign from "./actions/get-campaign.ts";

import listAutomations from "./actions/list-automations.ts";
import getAutomation from "./actions/get-automation.ts";
import addContactToAutomation from "./actions/add-contact-to-automation.ts";

import service from "./health/service.ts";
import site from "./health/site.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    listDeals,
    getDeal,
    createDeal,
    listCampaigns,
    getCampaign,
    listAutomations,
    getAutomation,
    addContactToAutomation,
  ],
  auth: [apiKey],
  healthChecks: [service, site, quota],
} satisfies AppDefinition;
