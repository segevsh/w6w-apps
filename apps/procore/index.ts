import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import oauth2Sandbox from "./auth/oauth2-sandbox.ts";
import meGet from "./actions/me-get.ts";
import companyList from "./actions/company-list.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import companyUserList from "./actions/company-user-list.ts";
import projectUserList from "./actions/project-user-list.ts";
import rfiList from "./actions/rfi-list.ts";
import rfiGet from "./actions/rfi-get.ts";
import rfiCreate from "./actions/rfi-create.ts";
import submittalList from "./actions/submittal-list.ts";
import submittalGet from "./actions/submittal-get.ts";
import observationList from "./actions/observation-list.ts";
import observationGet from "./actions/observation-get.ts";
import observationCreate from "./actions/observation-create.ts";
import punchItemList from "./actions/punch-item-list.ts";
import punchItemGet from "./actions/punch-item-get.ts";
import punchItemCreate from "./actions/punch-item-create.ts";
import folderList from "./actions/folder-list.ts";
import folderGet from "./actions/folder-get.ts";
import fileGet from "./actions/file-get.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    meGet,
    companyList,
    projectList,
    projectGet,
    companyUserList,
    projectUserList,
    rfiList,
    rfiGet,
    rfiCreate,
    submittalList,
    submittalGet,
    observationList,
    observationGet,
    observationCreate,
    punchItemList,
    punchItemGet,
    punchItemCreate,
    folderList,
    folderGet,
    fileGet,
  ],
  auth: [oauth2, oauth2Sandbox],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
