import { writeAction } from "../lib/factory.ts";

/**
 * `POST /TimeEntries` — log time against a ticket or a task.
 *
 * Per the vendor's TimeEntries page `resourceID` and `roleID` are required, `dateWorked` is
 * required when no `startDateTime` is given, and `summaryNotes` is required on task time. Set
 * `ticketID` or `taskID`, not both. The caller cannot set `billingCodeID`, `isNonBillable`,
 * `showOnInvoice` or a contract without the matching security-level permission; leaving all four
 * blank always works.
 */
export default writeAction({
  key: "time-entry-create",
  title: "Log time entry",
  description:
    "Log time on a ticket or task. Needs `resourceID` and `roleID`, plus `dateWorked` or " +
    "`startDateTime`; summary notes are required on task time.",
  resource: "time-entry",
  method: "POST",
  path: "/TimeEntries",
  fields: [
    { key: "resourceID", label: "Resource ID", type: "number", required: true },
    { key: "roleID", label: "Role ID", type: "number", required: true },
    { key: "ticketID", label: "Ticket ID", type: "number" },
    { key: "taskID", label: "Task ID", type: "number" },
    {
      key: "dateWorked",
      label: "Date worked",
      type: "datetime",
      hint: "Required when `startDateTime` is not given.",
    },
    { key: "startDateTime", label: "Start", type: "datetime" },
    { key: "endDateTime", label: "End", type: "datetime" },
    { key: "hoursWorked", label: "Hours worked", type: "number" },
    { key: "summaryNotes", label: "Summary notes", type: "text" },
    { key: "internalNotes", label: "Internal notes", type: "text" },
    { key: "billingCodeID", label: "Work type (billing code) ID", type: "number" },
    { key: "isNonBillable", label: "Non-billable", type: "boolean" },
  ],
});
