/**
 * Everhour — time tracking. Projects, tasks, time records, timers, timecards, timesheets,
 * expenses, invoices, clients, the resource-planner schedule, time off, reports and webhooks,
 * over the Everhour REST API (`api.everhour.com`).
 *
 * Every path, verb, parameter and enum here was verified on 2026-10-06 against Everhour's own
 * API Blueprint (`https://jsapi.apiary.io/apis/everhour.apib`, HOST `https://api.everhour.com`)
 * plus live probes of the host. The two endpoints the blueprint marks deprecated (Estimates
 * Report and Time Report exports) are deliberately not built.
 *
 * Findings that shaped the design (details where they matter, and in the README):
 *
 *  1. **A wrong key and a missing key are indistinguishable** (`auth/api-key.ts`): both answer
 *     the same `403 {"code":403,"message":"Access denied"}`. The verdict is a `User` body, not a
 *     status code.
 *  2. **Lists are bare arrays** (`lib/client.ts`), and ids are `platform:id` strings
 *     (`ev:123`, `as:456`) whose colon must stay literal in a path.
 *  3. **Time off rides the assignments endpoint** — `POST /resource-planner/assignments` with
 *     `type: "time-off"` — so Create Time Off and Create Assignment share a URL.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

import clientList from "./actions/client-list.ts";
import clientGet from "./actions/client-get.ts";
import clientCreate from "./actions/client-create.ts";
import clientUpdate from "./actions/client-update.ts";
import clientBudgetSet from "./actions/client-budget-set.ts";
import clientBudgetDelete from "./actions/client-budget-delete.ts";
import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceUpdate from "./actions/invoice-update.ts";
import invoiceRefresh from "./actions/invoice-refresh.ts";
import invoiceStatusSet from "./actions/invoice-status-set.ts";
import invoiceExport from "./actions/invoice-export.ts";
import invoiceDelete from "./actions/invoice-delete.ts";
import expenseList from "./actions/expense-list.ts";
import expenseCreate from "./actions/expense-create.ts";
import expenseUpdate from "./actions/expense-update.ts";
import expenseDelete from "./actions/expense-delete.ts";
import expenseCategoryList from "./actions/expense-category-list.ts";
import expenseCategoryCreate from "./actions/expense-category-create.ts";
import expenseCategoryUpdate from "./actions/expense-category-update.ts";
import expenseCategoryDelete from "./actions/expense-category-delete.ts";
import attachmentCreate from "./actions/attachment-create.ts";
import expenseAttachmentAdd from "./actions/expense-attachment-add.ts";
import attachmentDelete from "./actions/attachment-delete.ts";
import assignmentList from "./actions/assignment-list.ts";
import assignmentCreate from "./actions/assignment-create.ts";
import assignmentUpdate from "./actions/assignment-update.ts";
import assignmentDelete from "./actions/assignment-delete.ts";
import timeOffCreate from "./actions/time-off-create.ts";
import timeOffTypeList from "./actions/time-off-type-list.ts";
import timeOffTypeCreate from "./actions/time-off-type-create.ts";
import timeOffTypeUpdate from "./actions/time-off-type-update.ts";
import timeOffTypeDelete from "./actions/time-off-type-delete.ts";
import allocationList from "./actions/allocation-list.ts";
import allocationCreate from "./actions/allocation-create.ts";
import allocationUpdate from "./actions/allocation-update.ts";
import allocationDelete from "./actions/allocation-delete.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectArchive from "./actions/project-archive.ts";
import projectBillingSet from "./actions/project-billing-set.ts";
import projectDelete from "./actions/project-delete.ts";
import projectSync from "./actions/project-sync.ts";
import sectionList from "./actions/section-list.ts";
import sectionGet from "./actions/section-get.ts";
import sectionCreate from "./actions/section-create.ts";
import sectionUpdate from "./actions/section-update.ts";
import sectionDelete from "./actions/section-delete.ts";
import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskSearch from "./actions/task-search.ts";
import projectTaskSearch from "./actions/project-task-search.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";
import taskEstimateSet from "./actions/task-estimate-set.ts";
import taskEstimateDelete from "./actions/task-estimate-delete.ts";
import fieldList from "./actions/field-list.ts";
import fieldCreate from "./actions/field-create.ts";
import fieldUpdate from "./actions/field-update.ts";
import fieldDelete from "./actions/field-delete.ts";
import fieldReorder from "./actions/field-reorder.ts";
import timeList from "./actions/time-list.ts";
import userTimeList from "./actions/user-time-list.ts";
import taskTimeList from "./actions/task-time-list.ts";
import projectTimeList from "./actions/project-time-list.ts";
import timeAdd from "./actions/time-add.ts";
import timeUpdate from "./actions/time-update.ts";
import timeDelete from "./actions/time-delete.ts";
import timerStart from "./actions/timer-start.ts";
import timerCurrent from "./actions/timer-current.ts";
import timerTeamList from "./actions/timer-team-list.ts";
import timerStop from "./actions/timer-stop.ts";
import timecardGet from "./actions/timecard-get.ts";
import userTimecardList from "./actions/user-timecard-list.ts";
import timecardList from "./actions/timecard-list.ts";
import timecardClockIn from "./actions/timecard-clock-in.ts";
import timecardClockOut from "./actions/timecard-clock-out.ts";
import timecardUpdate from "./actions/timecard-update.ts";
import timecardDelete from "./actions/timecard-delete.ts";
import userTimesheetList from "./actions/user-timesheet-list.ts";
import timesheetList from "./actions/timesheet-list.ts";
import timesheetApprovalRequest from "./actions/timesheet-approval-request.ts";
import timesheetApprovalDiscard from "./actions/timesheet-approval-discard.ts";
import timesheetApprovalReview from "./actions/timesheet-approval-review.ts";
import projectReport from "./actions/project-report.ts";
import clientReport from "./actions/client-report.ts";
import userReport from "./actions/user-report.ts";
import userMe from "./actions/user-me.ts";
import userList from "./actions/user-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

export default {
  actions: [
    clientList,
    clientGet,
    clientCreate,
    clientUpdate,
    clientBudgetSet,
    clientBudgetDelete,
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceUpdate,
    invoiceRefresh,
    invoiceStatusSet,
    invoiceExport,
    invoiceDelete,
    expenseList,
    expenseCreate,
    expenseUpdate,
    expenseDelete,
    expenseCategoryList,
    expenseCategoryCreate,
    expenseCategoryUpdate,
    expenseCategoryDelete,
    attachmentCreate,
    expenseAttachmentAdd,
    attachmentDelete,
    assignmentList,
    assignmentCreate,
    assignmentUpdate,
    assignmentDelete,
    timeOffCreate,
    timeOffTypeList,
    timeOffTypeCreate,
    timeOffTypeUpdate,
    timeOffTypeDelete,
    allocationList,
    allocationCreate,
    allocationUpdate,
    allocationDelete,
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectArchive,
    projectBillingSet,
    projectDelete,
    projectSync,
    sectionList,
    sectionGet,
    sectionCreate,
    sectionUpdate,
    sectionDelete,
    taskList,
    taskGet,
    taskSearch,
    projectTaskSearch,
    taskCreate,
    taskUpdate,
    taskDelete,
    taskEstimateSet,
    taskEstimateDelete,
    fieldList,
    fieldCreate,
    fieldUpdate,
    fieldDelete,
    fieldReorder,
    timeList,
    userTimeList,
    taskTimeList,
    projectTimeList,
    timeAdd,
    timeUpdate,
    timeDelete,
    timerStart,
    timerCurrent,
    timerTeamList,
    timerStop,
    timecardGet,
    userTimecardList,
    timecardList,
    timecardClockIn,
    timecardClockOut,
    timecardUpdate,
    timecardDelete,
    userTimesheetList,
    timesheetList,
    timesheetApprovalRequest,
    timesheetApprovalDiscard,
    timesheetApprovalReview,
    projectReport,
    clientReport,
    userReport,
    userMe,
    userList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
