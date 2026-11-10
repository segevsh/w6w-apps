import type { AppDefinition } from "@w6w/types";

import oauth2 from "./auth/oauth2.ts";

// Contact
import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";
import addTagToContact from "./actions/add-tag-to-contact.ts";

// Opportunity / Pipeline
import listOpportunities from "./actions/list-opportunities.ts";
import createOpportunity from "./actions/create-opportunity.ts";
import listPipelines from "./actions/list-pipelines.ts";

// Calendar / Appointment
import listCalendars from "./actions/list-calendars.ts";
import listAppointments from "./actions/list-appointments.ts";
import createAppointment from "./actions/create-appointment.ts";

// Conversation
import sendMessage from "./actions/send-message.ts";
import listConversations from "./actions/list-conversations.ts";

// Location
import listLocations from "./actions/list-locations.ts";
import getLocation from "./actions/get-location.ts";

// Custom fields / Forms
import listCustomFields from "./actions/list-custom-fields.ts";
import listForms from "./actions/list-forms.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

import contactCreated from "./triggers/contact-created.ts";
import opportunityCreated from "./triggers/opportunity-created.ts";
import appointmentCreated from "./triggers/appointment-created.ts";
import inboundMessage from "./triggers/inbound-message.ts";
import contactUpdated from "./triggers/contact-updated.ts";
import contactDeleted from "./triggers/contact-deleted.ts";
import contactTagUpdated from "./triggers/contact-tag-updated.ts";
import opportunityUpdated from "./triggers/opportunity-updated.ts";
import opportunityDeleted from "./triggers/opportunity-deleted.ts";
import opportunityStageChanged from "./triggers/opportunity-stage-changed.ts";
import opportunityStatusChanged from "./triggers/opportunity-status-changed.ts";
import appointmentUpdated from "./triggers/appointment-updated.ts";
import appointmentDeleted from "./triggers/appointment-deleted.ts";
import outboundMessage from "./triggers/outbound-message.ts";
import locationCreated from "./triggers/location-created.ts";
import locationUpdated from "./triggers/location-updated.ts";
import anyEvent from "./triggers/any-event.ts";
import newOpportunity from "./triggers/new-opportunity.ts";
import conversationActive from "./triggers/conversation-active.ts";
import newPipeline from "./triggers/new-pipeline.ts";
import newCalendar from "./triggers/new-calendar.ts";
import newForm from "./triggers/new-form.ts";

export default {
  triggers: [
    contactCreated,
    opportunityCreated,
    appointmentCreated,
    inboundMessage,
    contactUpdated,
    contactDeleted,
    contactTagUpdated,
    opportunityUpdated,
    opportunityDeleted,
    opportunityStageChanged,
    opportunityStatusChanged,
    appointmentUpdated,
    appointmentDeleted,
    outboundMessage,
    locationCreated,
    locationUpdated,
    anyEvent,
    newOpportunity,
    conversationActive,
    newPipeline,
    newCalendar,
    newForm,
  ],
  auth: [oauth2],
  actions: [
    // contact
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    addTagToContact,
    // opportunity / pipeline
    listOpportunities,
    createOpportunity,
    listPipelines,
    // calendar / appointment
    listCalendars,
    listAppointments,
    createAppointment,
    // conversation
    sendMessage,
    listConversations,
    // location
    listLocations,
    getLocation,
    // custom fields / forms
    listCustomFields,
    listForms,
  ],
  healthChecks: [service, quota],
} satisfies AppDefinition;
