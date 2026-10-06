import { writeAction } from "../lib/factory.ts";

/**
 * `POST /Projects` — create a project.
 *
 * The vendor's Projects page marks `companyID`, `projectName`, `projectType`, `startDateTime` and
 * `endDateTime` required; `status` is a picklist and the API rejects a project without one in
 * practice. `projectLeadResourceID` is no longer required.
 */
export default writeAction({
  key: "project-create",
  title: "Create project",
  description:
    "Create a project for a company. `projectType` and `status` are picklist ids; start and end " +
    "are required.",
  resource: "project",
  method: "POST",
  path: "/Projects",
  fields: [
    { key: "companyID", label: "Company ID", type: "number", required: true },
    { key: "projectName", label: "Project name", type: "string", required: true },
    { key: "projectType", label: "Project type (picklist id)", type: "number", required: true },
    { key: "startDateTime", label: "Start", type: "datetime", required: true },
    { key: "endDateTime", label: "End", type: "datetime", required: true },
    { key: "status", label: "Status (picklist id)", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "projectLeadResourceID", label: "Project lead resource ID", type: "number" },
    { key: "contractID", label: "Contract ID", type: "number" },
    { key: "extProjectNumber", label: "External project number", type: "string" },
  ],
});
