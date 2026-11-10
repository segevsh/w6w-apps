import clientList from "../actions/client-list.ts";
import { snapshotTrigger, str } from "../lib/triggers.ts";

// GET /clients.json — "Getting your clients": returns every client (sub-account) of the account in
// one response with no paging, so it is snapshot-diffed (additions only)
// (https://www.campaignmonitor.com/api/v3-3/account/).
export default snapshotTrigger({
  key: "new-client",
  title: "New Client",
  description:
    "The run gets each client (sub-account) newly added to the Campaign Monitor account.",
  output: [
    { key: "ClientID", type: "string", label: "Client ID" },
    { key: "Name", type: "string", label: "Client name" },
  ],
  sample: { ClientID: "4a397ccaaa55eb4e6aa1221e1e2d7122", Name: "Acme Inc." },
  rows: async (_params, ctx) => (await clientList.execute({}, ctx)) ?? [],
  idOf: (item) => str((item as { ClientID?: unknown }).ClientID),
});
