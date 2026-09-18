import type { AppDefinition } from "@w6w/types";
import grantKey from "./auth/grant-key.ts";

import getCurrentUser from "./actions/get-current-user.ts";
import getOrganization from "./actions/get-organization.ts";

import listAccounts from "./actions/list-accounts.ts";
import getAccount from "./actions/get-account.ts";
import createAccount from "./actions/create-account.ts";
import updateAccount from "./actions/update-account.ts";
import deleteAccount from "./actions/delete-account.ts";

import listLocations from "./actions/list-locations.ts";
import createLocation from "./actions/create-location.ts";

import listJobs from "./actions/list-jobs.ts";
import getJob from "./actions/get-job.ts";
import createJob from "./actions/create-job.ts";

import listDocuments from "./actions/list-documents.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Grant / organization
    getCurrentUser,
    getOrganization,
    // Account (customer/vendor)
    listAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    // Location (job site)
    listLocations,
    createLocation,
    // Job
    listJobs,
    getJob,
    createJob,
    // Document (bid/order/bill/invoice)
    listDocuments,
  ],
  auth: [grantKey],
  healthChecks: [service],
} satisfies AppDefinition;
