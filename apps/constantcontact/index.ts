import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import createOrUpdateContact from "./actions/create-or-update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";
import unsubscribeContact from "./actions/unsubscribe-contact.ts";

import listContactLists from "./actions/list-contact-lists.ts";
import getContactList from "./actions/get-contact-list.ts";
import createContactList from "./actions/create-contact-list.ts";
import updateContactList from "./actions/update-contact-list.ts";
import deleteContactList from "./actions/delete-contact-list.ts";
import addContactsToLists from "./actions/add-contacts-to-lists.ts";
import removeContactsFromLists from "./actions/remove-contacts-from-lists.ts";

import listCustomFields from "./actions/list-custom-fields.ts";

import listEmailCampaigns from "./actions/list-email-campaigns.ts";
import getEmailCampaign from "./actions/get-email-campaign.ts";
import createEmailCampaign from "./actions/create-email-campaign.ts";
import getCampaignActivity from "./actions/get-campaign-activity.ts";

import importContacts from "./actions/import-contacts.ts";
import getActivityStatus from "./actions/get-activity-status.ts";

import getAccountSummary from "./actions/get-account-summary.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contact
    listContacts,
    getContact,
    createContact,
    updateContact,
    createOrUpdateContact,
    deleteContact,
    unsubscribeContact,
    // Contact list
    listContactLists,
    getContactList,
    createContactList,
    updateContactList,
    deleteContactList,
    addContactsToLists,
    removeContactsFromLists,
    // Custom field
    listCustomFields,
    // Email campaign
    listEmailCampaigns,
    getEmailCampaign,
    createEmailCampaign,
    getCampaignActivity,
    // Bulk activity
    importContacts,
    getActivityStatus,
    // Account
    getAccountSummary,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
