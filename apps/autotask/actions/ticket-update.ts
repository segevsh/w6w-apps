import { writeAction } from "../lib/factory.ts";

/**
 * `PATCH /Tickets` — change only the fields sent.
 *
 * PATCH, not PUT: the vendor documents PUT as "updates all fields regardless of whether or not
 * they contain values", so a PUT with a partial body blanks the rest. Closing a ticket is just
 * setting `status` to the database's "Complete" picklist id.
 */
export default writeAction({
  key: "ticket-update",
  title: "Update ticket",
  description:
    "Change the fields you send on a ticket (PATCH — everything else is left alone). To " +
    "complete a ticket set `status` to the database's Complete picklist id.",
  resource: "ticket",
  method: "PATCH",
  path: "/Tickets",
  fields: [
    { key: "title", label: "Title", type: "string" },
    { key: "status", label: "Status (picklist id)", type: "number" },
    { key: "priority", label: "Priority (picklist id)", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "resolution", label: "Resolution", type: "text" },
    { key: "queueID", label: "Queue ID", type: "number" },
    { key: "assignedResourceID", label: "Assigned resource ID", type: "number" },
    {
      key: "assignedResourceRoleID",
      label: "Assigned resource role ID",
      type: "number",
      hint: "Required by Autotask whenever `assignedResourceID` is set.",
    },
    { key: "contactID", label: "Contact ID", type: "number" },
    { key: "configurationItemID", label: "Configuration item ID", type: "number" },
    { key: "contractID", label: "Contract ID", type: "number" },
    { key: "issueType", label: "Issue type (picklist id)", type: "number" },
    { key: "subIssueType", label: "Sub-issue type (picklist id)", type: "number" },
    { key: "dueDateTime", label: "Due date and time", type: "datetime" },
    { key: "estimatedHours", label: "Estimated hours", type: "number" },
    { key: "billingCodeID", label: "Work type (billing code) ID", type: "number" },
  ],
});
