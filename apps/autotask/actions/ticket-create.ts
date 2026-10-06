import { writeAction } from "../lib/factory.ts";

/**
 * `POST /Tickets` — open a service desk ticket.
 *
 * The vendor's Tickets page marks `companyID`, `title`, `status` and `priority` required. `status`
 * and `priority` are PICKLIST ids that differ per database, so read them with `entity-fields`
 * (`Tickets`) rather than guessing. Two more requirements depend on the ticket CATEGORY and surface
 * as the API's own error: `queueID` (the category's "Queue is Required" setting) and `dueDateTime`
 * (required unless the category configures a default due date and time).
 */
export default writeAction({
  key: "ticket-create",
  title: "Create ticket",
  description:
    "Open a ticket. `status` and `priority` are per-database picklist ids (read them with " +
    "`entity-fields`); the ticket category can additionally require `queueID` or `dueDateTime`.",
  resource: "ticket",
  method: "POST",
  path: "/Tickets",
  fields: [
    { key: "companyID", label: "Company ID", type: "number", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "status", label: "Status (picklist id)", type: "number", required: true },
    { key: "priority", label: "Priority (picklist id)", type: "number", required: true },
    { key: "description", label: "Description", type: "text" },
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
    { key: "ticketType", label: "Ticket type (picklist id)", type: "number" },
    { key: "ticketCategory", label: "Ticket category (picklist id)", type: "number" },
    { key: "source", label: "Source (picklist id)", type: "number" },
    {
      key: "dueDateTime",
      label: "Due date and time",
      type: "datetime",
      hint: "Required unless the ticket category configures a default due date and time.",
    },
    { key: "estimatedHours", label: "Estimated hours", type: "number" },
    {
      key: "billingCodeID",
      label: "Work type (billing code) ID",
      type: "number",
      hint: "Required when the database enforces a Work Type on tickets.",
    },
  ],
});
