import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listLeads from "./actions/list-leads.ts";
import getLead from "./actions/get-lead.ts";
import createLead from "./actions/create-lead.ts";
import updateLead from "./actions/update-lead.ts";
import deleteLead from "./actions/delete-lead.ts";
import search from "./actions/search.ts";

import listContacts from "./actions/list-contacts.ts";
import createContact from "./actions/create-contact.ts";
import updateContact from "./actions/update-contact.ts";

import listOpportunities from "./actions/list-opportunities.ts";
import createOpportunity from "./actions/create-opportunity.ts";
import updateOpportunity from "./actions/update-opportunity.ts";

import listActivities from "./actions/list-activities.ts";
import createNote from "./actions/create-note.ts";
import logCall from "./actions/log-call.ts";

import listTasks from "./actions/list-tasks.ts";
import createTask from "./actions/create-task.ts";
import updateTask from "./actions/update-task.ts";

import listUsers from "./actions/list-users.ts";
import listStatuses from "./actions/list-statuses.ts";
import listCustomFields from "./actions/list-custom-fields.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Lead — the account object everything else hangs off
    listLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    search,
    // Contact
    listContacts,
    createContact,
    updateContact,
    // Opportunity
    listOpportunities,
    createOpportunity,
    updateOpportunity,
    // Activity
    listActivities,
    createNote,
    logCall,
    // Task
    listTasks,
    createTask,
    updateTask,
    // Organization metadata — the id lookups the actions above depend on
    listUsers,
    listStatuses,
    listCustomFields,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
