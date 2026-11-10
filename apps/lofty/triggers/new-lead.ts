import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import leadList from "../actions/lead-list.ts";

/** `GET /v1.0/leads?sort=CreateTime&desc=true&limit=100` — newest-created lead first. */
export default pollFromListAction({
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each newly created lead: its id, name, contact details and source.",
  action: leadList as ActionDefinition,
  input: () => ({ sort: "CreateTime", desc: true, limit: 100 }),
  items: (r) => (r as { leads?: unknown[] }).leads ?? [],
  idOf: (item) => String((item as { leadId?: unknown }).leadId ?? ""),
  output: [
    { key: "leadId", type: "number", label: "Lead ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "emails", type: "array", label: "Email addresses" },
    { key: "phones", type: "array", label: "Phone numbers" },
    { key: "source", type: "string", label: "Source" },
    { key: "stage", type: "string", label: "Pipeline stage" },
  ],
  sample: {
    leadId: 123456,
    firstName: "Dana",
    lastName: "Rivera",
    emails: ["dana@example.com"],
    phones: ["+15555550123"],
    source: "Website",
    stage: "New",
  },
  maxPages: 1,
});
