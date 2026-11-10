import { snapshotTrigger } from "../lib/triggers.ts";
import clientList from "../actions/client-list.ts";

export default snapshotTrigger({
  key: "new-client",
  title: "New Client",
  description: "The run gets each client newly added in Float.",
  action: clientList,
  idKey: "client_id",
  output: [
    { key: "client_id", type: "number", label: "Client ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { client_id: 401, name: "Acme Corp" },
});
