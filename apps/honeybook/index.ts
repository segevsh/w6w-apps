/**
 * HoneyBook — clientflow / CRM for service businesses, over the HoneyBook API v3
 * (`api.honeybook.com/api/v3`). See README.md for the verified API findings.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactInteractionSet from "./actions/contact-interaction-set.ts";
import contactTagAdd from "./actions/contact-tag-add.ts";
import contactTagRemove from "./actions/contact-tag-remove.ts";
import pipelineList from "./actions/pipeline-list.ts";
import pipelineCountsGet from "./actions/pipeline-counts-get.ts";
import workspaceList from "./actions/workspace-list.ts";
import workspaceCountsGet from "./actions/workspace-counts-get.ts";
import workspaceExists from "./actions/workspace-exists.ts";
import workspaceGet from "./actions/workspace-get.ts";
import workspaceUpdate from "./actions/workspace-update.ts";
import workspaceDelete from "./actions/workspace-delete.ts";
import workspaceDeletableGet from "./actions/workspace-deletable-get.ts";
import workspaceMemberList from "./actions/workspace-member-list.ts";
import workspaceMemberAdd from "./actions/workspace-member-add.ts";
import workspaceMemberRemove from "./actions/workspace-member-remove.ts";
import workspaceTagAdd from "./actions/workspace-tag-add.ts";
import workspaceTagRemove from "./actions/workspace-tag-remove.ts";
import workspaceArchive from "./actions/workspace-archive.ts";
import workspaceUnarchive from "./actions/workspace-unarchive.ts";
import workspaceBook from "./actions/workspace-book.ts";
import projectList from "./actions/project-list.ts";
import projectCreate from "./actions/project-create.ts";
import projectPayrollEmployeeCountsGet from "./actions/project-payroll-employee-counts-get.ts";
import projectGet from "./actions/project-get.ts";
import projectUpdate from "./actions/project-update.ts";
import projectDateCreate from "./actions/project-date-create.ts";
import projectDateUpdate from "./actions/project-date-update.ts";
import projectDateDelete from "./actions/project-date-delete.ts";
import projectPayrollEmployeeList from "./actions/project-payroll-employee-list.ts";
import projectPayrollEmployeeAdd from "./actions/project-payroll-employee-add.ts";
import projectPayrollEmployeeRemove from "./actions/project-payroll-employee-remove.ts";
import projectSpaceAdd from "./actions/project-space-add.ts";
import projectSpaceRemove from "./actions/project-space-remove.ts";
import projectConflictsGet from "./actions/project-conflicts-get.ts";
import projectWorkspaceCreate from "./actions/project-workspace-create.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // contact
    contactCreate,
    contactUpdate,
    contactDelete,
    contactInteractionSet,
    contactTagAdd,
    contactTagRemove,
    // pipeline
    pipelineList,
    pipelineCountsGet,
    // workspace
    workspaceList,
    workspaceCountsGet,
    workspaceExists,
    workspaceGet,
    workspaceUpdate,
    workspaceDelete,
    workspaceDeletableGet,
    workspaceMemberList,
    workspaceMemberAdd,
    workspaceMemberRemove,
    workspaceTagAdd,
    workspaceTagRemove,
    workspaceArchive,
    workspaceUnarchive,
    workspaceBook,
    // project
    projectList,
    projectCreate,
    projectPayrollEmployeeCountsGet,
    projectGet,
    projectUpdate,
    projectDateCreate,
    projectDateUpdate,
    projectDateDelete,
    projectPayrollEmployeeList,
    projectPayrollEmployeeAdd,
    projectPayrollEmployeeRemove,
    projectSpaceAdd,
    projectSpaceRemove,
    projectConflictsGet,
    projectWorkspaceCreate,
  ],
  auth: [oauth2],
  healthChecks: [service],
} satisfies AppDefinition;
