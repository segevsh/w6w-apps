import { anyEventTrigger } from "../lib/triggers.ts";

export default anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "The run gets each delivery for the Clockify webhook events you name (tags, invoices, users, approvals, time off, expenses, assignments, groups, rates and every other event Clockify can send), with the event name in webhookEvent.",
  output: [
    { key: "webhookEvent", type: "string", label: "Clockify event name" },
    { key: "id", type: "string", label: "Record ID" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name (when the record has one)" },
  ],
  sample: {
    webhookEvent: "NEW_TAG",
    id: "5b715612b079875110793333",
    name: "urgent",
    workspaceId: "64a687e29ae1f428e7ebe303",
  },
});
