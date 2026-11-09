import { rowTrigger, sampleFor } from "../lib/triggers.ts";

export default rowTrigger({
  key: "row-added-or-updated",
  title: "New or Updated Row",
  description:
    "Fires when a row is added or an existing row changes. The run gets the change (added or updated), the row's cells keyed by header, plus its row number (or its key, when a key column is set).",
  emit: { added: true, updated: true },
  sample: sampleFor("added-or-updated"),
});
