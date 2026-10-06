import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";
import deleteContact from "./actions/delete-contact.ts";
import assignContactTag from "./actions/assign-contact-tag.ts";
import changeContactStatus from "./actions/change-contact-status.ts";

import listCompanies from "./actions/list-companies.ts";
import getCompany from "./actions/get-company.ts";

import listDeals from "./actions/list-deals.ts";
import getDeal from "./actions/get-deal.ts";
import createDeal from "./actions/create-deal.ts";
import updateDeal from "./actions/update-deal.ts";

import listActions from "./actions/list-actions.ts";
import createAction from "./actions/create-action.ts";
import markActionDone from "./actions/mark-action-done.ts";

import listNotes from "./actions/list-notes.ts";
import createNote from "./actions/create-note.ts";
import createCall from "./actions/create-call.ts";

import listUsers from "./actions/list-users.ts";
import listStatuses from "./actions/list-statuses.ts";
import listLeadSources from "./actions/list-lead-sources.ts";
import listPipelines from "./actions/list-pipelines.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    assignContactTag,
    changeContactStatus,
    // Companies
    listCompanies,
    getCompany,
    // Deals
    listDeals,
    getDeal,
    createDeal,
    updateDeal,
    // Next actions
    listActions,
    createAction,
    markActionDone,
    // Notes and calls
    listNotes,
    createNote,
    createCall,
    // Lookups for the ids the actions above take
    listUsers,
    listStatuses,
    listLeadSources,
    listPipelines,
  ],
  auth: [basic],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
