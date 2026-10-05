/**
 * Workday — the REST API (HCM): workers, jobs, organizations, absence and time off, person contact
 * information and time tracking, across the `staffing` v7, `common` v1, `absenceManagement` v5,
 * `person` v4 and `timeTracking` v7 services, addressed per tenant at
 * `https://{host}/ccx/api/{service}/{version}/{tenant}`.
 *
 * Every path, parameter and response field comes from the Swagger documents Workday publishes
 * in its REST Services Directory (verified 2026-10-05). The README lists what is out of scope and
 * the one prefix (`common`) the public documents do not state.
 */
import type { AppDefinition } from "@w6w/types";
import absenceBalanceList from "./actions/absence-balance-list.ts";
import eligibleAbsenceTypeList from "./actions/eligible-absence-type-list.ts";
import jobFamilyList from "./actions/job-family-list.ts";
import jobGet from "./actions/job-get.ts";
import jobList from "./actions/job-list.ts";
import jobProfileList from "./actions/job-profile-list.ts";
import leaveOfAbsenceList from "./actions/leave-of-absence-list.ts";
import organizationList from "./actions/organization-list.ts";
import personGet from "./actions/person-get.ts";
import personWorkAddressList from "./actions/person-work-address-list.ts";
import personWorkEmailList from "./actions/person-work-email-list.ts";
import personWorkPhoneList from "./actions/person-work-phone-list.ts";
import supervisoryOrganizationGet from "./actions/supervisory-organization-get.ts";
import supervisoryOrganizationList from "./actions/supervisory-organization-list.ts";
import timeOffDetailList from "./actions/time-off-detail-list.ts";
import timeOffRequest from "./actions/time-off-request.ts";
import timeTotalList from "./actions/time-total-list.ts";
import validTimeOffDateList from "./actions/valid-time-off-date-list.ts";
import workerDirectReportList from "./actions/worker-direct-report-list.ts";
import workerGet from "./actions/worker-get.ts";
import workerHistoryList from "./actions/worker-history-list.ts";
import workerList from "./actions/worker-list.ts";
import workerManagedOrganizationList from "./actions/worker-managed-organization-list.ts";
import workerOrganizationList from "./actions/worker-organization-list.ts";
import workerServiceDates from "./actions/worker-service-dates.ts";
import refreshToken from "./auth/refresh-token.ts";
import service from "./health/service.ts";

const app: AppDefinition = {
  actions: [
    absenceBalanceList,
    eligibleAbsenceTypeList,
    jobFamilyList,
    jobGet,
    jobList,
    jobProfileList,
    leaveOfAbsenceList,
    organizationList,
    personGet,
    personWorkAddressList,
    personWorkEmailList,
    personWorkPhoneList,
    supervisoryOrganizationGet,
    supervisoryOrganizationList,
    timeOffDetailList,
    timeOffRequest,
    timeTotalList,
    validTimeOffDateList,
    workerDirectReportList,
    workerGet,
    workerHistoryList,
    workerList,
    workerManagedOrganizationList,
    workerOrganizationList,
    workerServiceDates,
  ],
  auth: [refreshToken],
  healthChecks: [service],
};

export default app;
