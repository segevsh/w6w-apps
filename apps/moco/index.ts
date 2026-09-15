import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";

import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";

import activityList from "./actions/activity-list.ts";
import activityGet from "./actions/activity-get.ts";
import activityCreate from "./actions/activity-create.ts";
import activityUpdate from "./actions/activity-update.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceUpdateStatus from "./actions/invoice-update-status.ts";

import account from "./health/account.ts";
import service from "./health/service.ts";

export default {
  actions: [
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    companyList,
    companyGet,
    companyCreate,
    projectList,
    projectGet,
    projectCreate,
    activityList,
    activityGet,
    activityCreate,
    activityUpdate,
    invoiceList,
    invoiceGet,
    invoiceUpdateStatus,
  ],
  auth: [apiKey],
  healthChecks: [account, service],
} satisfies AppDefinition;
