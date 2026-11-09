import { pollFromListAction } from "../../_shared/poll/mod.ts";
import envelopeList from "../actions/envelope-list.ts";
import { envelopeItems, envelopeOutput, envelopeSample, fromDate } from "../lib/triggers.ts";

// `envelope-list` is `Envelopes: listStatusChanges`, which documents `order_by=created` with
// `order=desc` and a required `from_date` (looked back 30 days here).
export default pollFromListAction({
  key: "new-envelope",
  title: "New Envelope",
  description: "The run gets each newly created envelope.",
  action: envelopeList,
  input: () => ({
    fromDate: fromDate(),
    orderBy: "created",
    order: "desc",
    count: 100,
    startPosition: 0,
  }),
  items: envelopeItems,
  idOf: (item) => String((item as { envelopeId?: unknown }).envelopeId ?? ""),
  output: envelopeOutput,
  sample: envelopeSample,
  maxPages: 1,
});
