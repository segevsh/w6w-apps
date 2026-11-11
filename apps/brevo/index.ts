import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import createContact from "./actions/create-contact.ts";
import upsertContact from "./actions/upsert-contact.ts";
import getContact from "./actions/get-contact.ts";
import deleteContact from "./actions/delete-contact.ts";
import listContacts from "./actions/list-contacts.ts";
import updateContact from "./actions/update-contact.ts";

import createAttribute from "./actions/create-attribute.ts";
import updateAttribute from "./actions/update-attribute.ts";
import deleteAttribute from "./actions/delete-attribute.ts";
import listAttributes from "./actions/list-attributes.ts";

import createSender from "./actions/create-sender.ts";
import deleteSender from "./actions/delete-sender.ts";
import listSenders from "./actions/list-senders.ts";

import sendEmail from "./actions/send-email.ts";
import sendTemplateEmail from "./actions/send-template-email.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import newContact from "./triggers/new-contact.ts";
import contactCreated from "./triggers/contact-created.ts";
import newSender from "./triggers/new-sender.ts";
import contactUpdated from "./triggers/contact-updated.ts";
import contactDeleted from "./triggers/contact-deleted.ts";
import emailDelivered from "./triggers/email-delivered.ts";
import emailOpened from "./triggers/email-opened.ts";
import emailClicked from "./triggers/email-clicked.ts";
import emailBounced from "./triggers/email-bounced.ts";
import emailUnsubscribed from "./triggers/email-unsubscribed.ts";
import inboundEmail from "./triggers/inbound-email.ts";
import anyEvent from "./triggers/any-event.ts";

export default {
  actions: [
    // Contact
    createContact,
    upsertContact,
    getContact,
    deleteContact,
    listContacts,
    updateContact,
    // Attribute
    createAttribute,
    updateAttribute,
    deleteAttribute,
    listAttributes,
    // Sender
    createSender,
    deleteSender,
    listSenders,
    // Email
    sendEmail,
    sendTemplateEmail,
  ],
  auth: [apiKey],
  triggers: [
    newContact,
    contactCreated,
    newSender,
    contactUpdated,
    contactDeleted,
    emailDelivered,
    emailOpened,
    emailClicked,
    emailBounced,
    emailUnsubscribed,
    inboundEmail,
    anyEvent,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
