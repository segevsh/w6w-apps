import { rowTrigger, sampleFor } from "../lib/triggers.ts";

export default rowTrigger({
  key: "row-added",
  title: "New Row",
  description:
    "Fires when a row is added to a sheet. The run gets the row's cells keyed by header, plus its row number (or its key, when a key column is set).",
  emit: { added: true, updated: false },
  sample: sampleFor("added"),
});
