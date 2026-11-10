import smartEmailList from "../actions/smart-email-list.ts";
import { snapshotTrigger, str } from "../lib/triggers.ts";

// GET /transactional/smartEmail — "Listing smart emails": returns every smart transactional email
// in one response with no paging, so it is snapshot-diffed (additions only)
// (https://www.campaignmonitor.com/api/v3-3/transactional/).
export default snapshotTrigger({
  key: "new-smart-email",
  title: "New Smart Email",
  description: "The run gets each smart transactional email newly created (drafts included).",
  params: [{
    key: "clientId",
    label: "Client",
    type: "string",
    placeholder: "4a397ccaaa55eb4e6aa1221e1e2d7122",
    hint: "REQUIRED if your connection uses an account-wide key or OAuth; leave empty for a " +
      "client-specific key.",
  }],
  output: [
    { key: "ID", type: "string", label: "Smart email ID" },
    { key: "Name", type: "string", label: "Name" },
    { key: "CreatedAt", type: "string", label: "Created at" },
    { key: "Status", type: "string", label: "Active | Draft" },
  ],
  sample: {
    ID: "b4a9cc0e-7c4e-4f3b-9d6a-0d5d7f3a1c11",
    Name: "Welcome email",
    CreatedAt: "2026-11-09T09:00:00+00:00",
    Status: "Active",
  },
  rows: async (params, ctx) =>
    (await smartEmailList.execute({
      clientId: params.clientId ? str(params.clientId) : undefined,
    }, ctx)) ?? [],
  idOf: (item) => str((item as { ID?: unknown }).ID),
});
