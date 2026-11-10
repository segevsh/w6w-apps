import klipList from "../actions/klip-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-klip",
  title: "New Klip",
  description: "The run gets each Klip newly created in the Klipfolio account.",
  action: klipList as never,
  idLabel: "Klip ID",
  sample: { change: "added", key: "k1a2b3", values: { id: "k1a2b3", name: "Revenue by region" } },
});
