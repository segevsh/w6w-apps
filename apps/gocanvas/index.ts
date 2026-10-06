/**
 * GoCanvas - forms, submissions, dispatches, customers, sites, projects, users,
 * groups, reference data and form webhooks over the REST API v3
 * (`www.gocanvas.com/api/v3`).
 *
 * Every path, verb, parameter and body field was read from the vendor's v3
 * reference (`api.gocanvas.com/api/v3/docs`, fetched 2026-10-06) and spot-checked
 * against the live host. Not covered yet: see README.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import meGet from "./actions/me-get.ts";
import customerList from "./actions/customer-list.ts";
import customerGet from "./actions/customer-get.ts";
import customerCreate from "./actions/customer-create.ts";
import customerUpdate from "./actions/customer-update.ts";
import customerDelete from "./actions/customer-delete.ts";
import siteList from "./actions/site-list.ts";
import siteGet from "./actions/site-get.ts";
import siteCreate from "./actions/site-create.ts";
import siteUpdate from "./actions/site-update.ts";
import siteDelete from "./actions/site-delete.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDelete from "./actions/project-delete.ts";
import departmentList from "./actions/department-list.ts";
import departmentCreate from "./actions/department-create.ts";
import departmentUserList from "./actions/department-user-list.ts";
import departmentUserAdd from "./actions/department-user-add.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import formList from "./actions/form-list.ts";
import formGet from "./actions/form-get.ts";
import formAssignedUserList from "./actions/form-assigned-user-list.ts";
import formUserAssign from "./actions/form-user-assign.ts";
import formUserUnassign from "./actions/form-user-unassign.ts";
import formReportList from "./actions/form-report-list.ts";
import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import submissionList from "./actions/submission-list.ts";
import submissionGet from "./actions/submission-get.ts";
import submissionRevisionList from "./actions/submission-revision-list.ts";
import submissionCreate from "./actions/submission-create.ts";
import submissionUpdate from "./actions/submission-update.ts";
import submissionDelete from "./actions/submission-delete.ts";
import dispatchList from "./actions/dispatch-list.ts";
import dispatchGet from "./actions/dispatch-get.ts";
import dispatchCreate from "./actions/dispatch-create.ts";
import dispatchDelete from "./actions/dispatch-delete.ts";
import referenceDataList from "./actions/reference-data-list.ts";
import referenceDataGet from "./actions/reference-data-get.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import webhookTest from "./actions/webhook-test.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    meGet,
    customerList,
    customerGet,
    customerCreate,
    customerUpdate,
    customerDelete,
    siteList,
    siteGet,
    siteCreate,
    siteUpdate,
    siteDelete,
    projectList,
    projectGet,
    projectCreate,
    projectUpdate,
    projectDelete,
    departmentList,
    departmentCreate,
    departmentUserList,
    departmentUserAdd,
    userList,
    userGet,
    userCreate,
    userUpdate,
    formList,
    formGet,
    formAssignedUserList,
    formUserAssign,
    formUserUnassign,
    formReportList,
    groupList,
    groupGet,
    submissionList,
    submissionGet,
    submissionRevisionList,
    submissionCreate,
    submissionUpdate,
    submissionDelete,
    dispatchList,
    dispatchGet,
    dispatchCreate,
    dispatchDelete,
    referenceDataList,
    referenceDataGet,
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    webhookTest,
  ],
  // HTTP Basic only: v3 OAuth needs a customer-created OAuth application.
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
