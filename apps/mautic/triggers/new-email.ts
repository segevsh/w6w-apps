import type { TriggerDefinition } from "@w6w/types";
import emailList from "../actions/email-list.ts";
import { newRecords } from "../lib/snapshot.ts";

/**
 * `GET /emails` is a small collection read in full through `email-list` (`returnAll`, `start`/`limit`
 * paging; https://devdocs.mautic.org/en/7.1/rest_api/emails.html, 2026-11-10); a check diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-email",
  title: "New Email",
  description: "The run gets each email (template or segment email) that appears in Mautic.",
  output: [
    { key: "id", type: "number", label: "Email ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "emailType", type: "string", label: "Type (template or list)" },
    { key: "dateAdded", type: "string", label: "Created at" },
  ],
  sample: {
    "id": 9,
    "name": "Welcome",
    "subject": "Welcome, {contactfield=firstname}",
    "emailType": "template",
    "dateAdded": "2026-11-09T09:30:00+00:00",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) => newRecords({ state, action: emailList, ctx }),
};

export default trigger;
