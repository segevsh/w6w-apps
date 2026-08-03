import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import searchPeople from "./actions/search-people.ts";
import getPerson from "./actions/get-person.ts";
import createPerson from "./actions/create-person.ts";
import updatePerson from "./actions/update-person.ts";
import deletePerson from "./actions/delete-person.ts";
import checkDuplicate from "./actions/check-duplicate.ts";

import createEvent from "./actions/create-event.ts";
import searchEvents from "./actions/search-events.ts";

import createNote from "./actions/create-note.ts";
import logCall from "./actions/log-call.ts";

import searchTasks from "./actions/search-tasks.ts";
import createTask from "./actions/create-task.ts";
import updateTask from "./actions/update-task.ts";

import searchAppointments from "./actions/search-appointments.ts";
import createAppointment from "./actions/create-appointment.ts";

import searchDeals from "./actions/search-deals.ts";
import createDeal from "./actions/create-deal.ts";
import updateDeal from "./actions/update-deal.ts";

import listActionPlans from "./actions/list-action-plans.ts";
import applyActionPlan from "./actions/apply-action-plan.ts";

import listPipelines from "./actions/list-pipelines.ts";
import listStages from "./actions/list-stages.ts";
import listUsers from "./actions/list-users.ts";
import listCustomFields from "./actions/list-custom-fields.ts";
import listSmartLists from "./actions/list-smart-lists.ts";
import getIdentity from "./actions/get-identity.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Person — the contact everything else hangs off
    searchPeople,
    getPerson,
    createPerson,
    updatePerson,
    deletePerson,
    checkDuplicate,
    // Event — the lead pipe. Create Event, not Create Person, is how leads
    // enter Follow Up Boss with automations, routing and notifications intact.
    createEvent,
    searchEvents,
    // Activity
    createNote,
    logCall,
    // Task
    searchTasks,
    createTask,
    updateTask,
    // Appointment
    searchAppointments,
    createAppointment,
    // Deal — the transaction pipeline
    searchDeals,
    createDeal,
    updateDeal,
    // Action plan — the follow-up sequences
    listActionPlans,
    applyActionPlan,
    // Account metadata — the id lookups the actions above depend on
    listPipelines,
    listStages,
    listUsers,
    listCustomFields,
    listSmartLists,
    getIdentity,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
