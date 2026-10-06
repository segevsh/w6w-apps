import type { AppDefinition } from "@w6w/types";
import serviceUser from "./auth/service-user.ts";

import peopleSearch from "./actions/people-search.ts";
import personGet from "./actions/person-get.ts";
import profilesList from "./actions/profiles-list.ts";
import personCreate from "./actions/person-create.ts";
import personUpdate from "./actions/person-update.ts";
import personTerminate from "./actions/person-terminate.ts";
import fieldsList from "./actions/fields-list.ts";
import namedListsList from "./actions/named-lists-list.ts";
import namedListGet from "./actions/named-list-get.ts";
import onboardingWizardsList from "./actions/onboarding-wizards-list.ts";
import workHistoryList from "./actions/work-history-list.ts";
import employmentHistoryList from "./actions/employment-history-list.ts";
import lifecycleHistoryList from "./actions/lifecycle-history-list.ts";
import timeoffRequestCreate from "./actions/timeoff-request-create.ts";
import timeoffRequestGet from "./actions/timeoff-request-get.ts";
import timeoffRequestCancel from "./actions/timeoff-request-cancel.ts";
import timeoffRequestsChanges from "./actions/timeoff-requests-changes.ts";
import timeoffWhosout from "./actions/timeoff-whosout.ts";
import timeoffOuttoday from "./actions/timeoff-outtoday.ts";
import timeoffBalanceGet from "./actions/timeoff-balance-get.ts";
import timeoffPolicyTypesList from "./actions/timeoff-policy-types-list.ts";
import tasksList from "./actions/tasks-list.ts";
import tasksPersonList from "./actions/tasks-person-list.ts";
import taskComplete from "./actions/task-complete.ts";
import reportsList from "./actions/reports-list.ts";
import reportDownload from "./actions/report-download.ts";
import attendanceEntriesSearch from "./actions/attendance-entries-search.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    peopleSearch,
    personGet,
    profilesList,
    personCreate,
    personUpdate,
    personTerminate,
    fieldsList,
    namedListsList,
    namedListGet,
    onboardingWizardsList,
    workHistoryList,
    employmentHistoryList,
    lifecycleHistoryList,
    timeoffRequestCreate,
    timeoffRequestGet,
    timeoffRequestCancel,
    timeoffRequestsChanges,
    timeoffWhosout,
    timeoffOuttoday,
    timeoffBalanceGet,
    timeoffPolicyTypesList,
    tasksList,
    tasksPersonList,
    taskComplete,
    reportsList,
    reportDownload,
    attendanceEntriesSearch,
  ],
  // Service user (HTTP Basic) only. Bob's other scheme, OAuth 2.0, is for approved
  // marketplace partners and needs a partner registration, so it is not offered.
  auth: [serviceUser],
  healthChecks: [service, quota],
} satisfies AppDefinition;
