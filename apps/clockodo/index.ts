import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listEntries from "./actions/list-entries.ts";
import getEntry from "./actions/get-entry.ts";
import createEntry from "./actions/create-entry.ts";
import updateEntry from "./actions/update-entry.ts";
import deleteEntry from "./actions/delete-entry.ts";
import getClock from "./actions/get-clock.ts";
import startClock from "./actions/start-clock.ts";
import stopClock from "./actions/stop-clock.ts";
import listCustomers from "./actions/list-customers.ts";
import getCustomer from "./actions/get-customer.ts";
import createCustomer from "./actions/create-customer.ts";
import updateCustomer from "./actions/update-customer.ts";
import deleteCustomer from "./actions/delete-customer.ts";
import listProjects from "./actions/list-projects.ts";
import getProject from "./actions/get-project.ts";
import createProject from "./actions/create-project.ts";
import updateProject from "./actions/update-project.ts";
import completeProject from "./actions/complete-project.ts";
import listServices from "./actions/list-services.ts";
import getService from "./actions/get-service.ts";
import createService from "./actions/create-service.ts";
import listUsers from "./actions/list-users.ts";
import getUser from "./actions/get-user.ts";
import getCurrentUser from "./actions/get-current-user.ts";
import listAbsences from "./actions/list-absences.ts";
import getAbsence from "./actions/get-absence.ts";
import createAbsence from "./actions/create-absence.ts";
import updateAbsence from "./actions/update-absence.ts";
import deleteAbsence from "./actions/delete-absence.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Clockodo — time tracking: time entries and the running clock, customers, projects, services,
 * users and absences, on the newest documented version of each resource (v2 entries/clock, v3
 * customers/users, v4 projects/services/absences).
 */
export default {
  actions: [
    listEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    getClock,
    startClock,
    stopClock,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    listProjects,
    getProject,
    createProject,
    updateProject,
    completeProject,
    listServices,
    getService,
    createService,
    listUsers,
    getUser,
    getCurrentUser,
    listAbsences,
    getAbsence,
    createAbsence,
    updateAbsence,
    deleteAbsence,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
