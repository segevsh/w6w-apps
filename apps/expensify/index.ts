import type { AppDefinition } from "@w6w/types";
import partner from "./auth/partner.ts";

import createExpenses from "./actions/create-expenses.ts";
import createReport from "./actions/create-report.ts";
import createPolicy from "./actions/create-policy.ts";
import createExpenseRule from "./actions/create-expense-rule.ts";
import listPolicies from "./actions/list-policies.ts";
import getPolicy from "./actions/get-policy.ts";
import listDomainCards from "./actions/list-domain-cards.ts";
import exportReports from "./actions/export-reports.ts";
import runReconciliation from "./actions/run-reconciliation.ts";
import downloadFile from "./actions/download-file.ts";
import updatePolicy from "./actions/update-policy.ts";
import updateReportStatus from "./actions/update-report-status.ts";
import updateTagApprovers from "./actions/update-tag-approvers.ts";
import updateExpenseRule from "./actions/update-expense-rule.ts";
import updateEmployees from "./actions/update-employees.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

/**
 * Expensify — the documented Integration Server job types, built from
 * integrations.expensify.com/Integration-Server/doc/. The deprecated CSV "Employee updater" is
 * replaced by the Advanced Employee Updater; OAuth2 partner auth (private beta), SFTP/feed-URL
 * data sources and the CSV tag-file mode are not covered; see the README.
 */
export default {
  actions: [
    // Create
    createExpenses,
    createReport,
    createPolicy,
    createExpenseRule,
    // Read
    listPolicies,
    getPolicy,
    listDomainCards,
    // Export and download
    exportReports,
    runReconciliation,
    downloadFile,
    // Update
    updatePolicy,
    updateReportStatus,
    updateTagApprovers,
    updateExpenseRule,
    updateEmployees,
  ],
  auth: [partner],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
