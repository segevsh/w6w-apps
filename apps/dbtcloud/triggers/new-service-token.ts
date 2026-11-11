import { snapshotList } from "../lib/snapshot.ts";
import serviceTokenList from "../actions/service-token-list.ts";

export default snapshotList({
  key: "new-service-token",
  title: "New Service Token",
  description: "The run gets each newly created service token (the token value is never included).",
  action: serviceTokenList,
  rows: "tokens",
  output: [
    { key: "id", type: "number", label: "Token ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 601, name: "CI token" },
});
