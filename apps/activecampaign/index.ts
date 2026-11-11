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
import newContact from "./triggers/new-contact.ts";
import anyEvent from "./triggers/any-event.ts";
import contactUpdated from "./triggers/contact-updated.ts";
import contactUnsubscribed from "./triggers/contact-unsubscribed.ts";
import contactTagAdded from "./triggers/contact-tag-added.ts";
import contactTagRemoved from "./triggers/contact-tag-removed.ts";
import dealAdded from "./triggers/deal-added.ts";
import dealUpdated from "./triggers/deal-updated.ts";
import campaignSent from "./triggers/campaign-sent.ts";
import campaignOpened from "./triggers/campaign-opened.ts";
import campaignLinkClicked from "./triggers/campaign-link-clicked.ts";
import emailBounced from "./triggers/email-bounced.ts";
import newOrUpdatedContact from "./triggers/new-or-updated-contact.ts";
import newSentCampaign from "./triggers/new-sent-campaign.ts";
import newAutomation from "./triggers/new-automation.ts";
import newOrUpdatedAutomation from "./triggers/new-or-updated-automation.ts";

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
  triggers: [
    newContact,
    contactUpdated,
    contactUnsubscribed,
    contactTagAdded,
    contactTagRemoved,
    dealAdded,
    dealUpdated,
    campaignSent,
    campaignOpened,
    campaignLinkClicked,
    emailBounced,
    anyEvent,
    newOrUpdatedContact,
    newSentCampaign,
    newAutomation,
    newOrUpdatedAutomation,
  ],
  healthChecks: [service, site, quota],
} satisfies AppDefinition;
