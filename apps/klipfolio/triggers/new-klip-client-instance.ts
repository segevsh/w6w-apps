import klipClientInstanceList from "../actions/klip-client-instance-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-klip-client-instance",
  title: "New Klip Client Instance",
  description:
    "The run gets each client instance newly created for the chosen Klip (partner accounts).",
  action: klipClientInstanceList as never,
  idLabel: "Client instance ID",
  sample: { change: "added", key: "ci1a2b3", values: { id: "ci1a2b3" } },
  params: [{
    key: "klip_id",
    label: "Klip ID",
    type: "string",
    required: true,
    hint: "The Klip to watch (the id from Klipfolio's Klip list).",
  }],
  paged: false,
});
