import clientList from "../actions/client-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-client",
  title: "New Client",
  description: "The run gets each client account newly created (partner accounts).",
  action: clientList as never,
  idLabel: "Client ID",
  sample: { change: "added", key: "c1a2b3", values: { id: "c1a2b3", name: "Acme Inc" } },
});
