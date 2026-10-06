import { writeAction } from "../lib/factory.ts";

/** `PATCH /Projects` — change only the fields sent. */
export default writeAction({
  key: "project-update",
  title: "Update project",
  description: "Change the fields you send on a project (PATCH — everything else is left alone).",
  resource: "project",
  method: "PATCH",
  path: "/Projects",
  fields: [
    { key: "projectName", label: "Project name", type: "string" },
    { key: "projectType", label: "Project type (picklist id)", type: "number" },
    { key: "status", label: "Status (picklist id)", type: "number" },
    { key: "startDateTime", label: "Start", type: "datetime" },
    { key: "endDateTime", label: "End", type: "datetime" },
    { key: "description", label: "Description", type: "text" },
    { key: "projectLeadResourceID", label: "Project lead resource ID", type: "number" },
    { key: "contractID", label: "Contract ID", type: "number" },
    { key: "extProjectNumber", label: "External project number", type: "string" },
  ],
});
