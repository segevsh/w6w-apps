import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import sendEmail from "./actions/send-email.ts";
import sendTemplateEmail from "./actions/send-template-email.ts";
import sendEmailBatch from "./actions/send-email-batch.ts";

import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import manageContactLists from "./actions/manage-contact-lists.ts";

import listContactLists from "./actions/list-contact-lists.ts";
import createContactList from "./actions/create-contact-list.ts";
import manageManyContacts from "./actions/manage-many-contacts.ts";
import getContactImportJob from "./actions/get-contact-import-job.ts";

import listMessages from "./actions/list-messages.ts";
import getMessage from "./actions/get-message.ts";

import listTemplates from "./actions/list-templates.ts";
import listSenders from "./actions/list-senders.ts";
import getStatCounters from "./actions/get-stat-counters.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Send (v3.1)
    sendEmail,
    sendTemplateEmail,
    sendEmailBatch,
    // Contact
    listContacts,
    getContact,
    createContact,
    updateContact,
    manageContactLists,
    // Contact list
    listContactLists,
    createContactList,
    manageManyContacts,
    getContactImportJob,
    // Message log
    listMessages,
    getMessage,
    // Templates, senders, statistics
    listTemplates,
    listSenders,
    getStatCounters,
  ],
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
