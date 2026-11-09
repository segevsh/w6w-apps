import { rowTrigger, sampleFor } from "../lib/triggers.ts";

export default rowTrigger({
  key: "row-updated",
  title: "Updated Row",
  description:
    "Fires when an existing row's cells change. The run gets the row's new cells keyed by header, plus its row number (or its key, when a key column is set).",
  emit: { added: false, updated: true },
  sample: sampleFor("updated"),
});
