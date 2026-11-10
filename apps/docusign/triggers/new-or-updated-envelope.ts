import { pollFromListAction } from "../../_shared/poll/mod.ts";
import envelopeList from "../actions/envelope-list.ts";
import { envelopeItems, envelopeOutput, envelopeSample, fromDate } from "../lib/triggers.ts";

export default pollFromListAction({
  key: "new-or-updated-envelope",
  title: "New or Updated Envelope",
  description:
    "The run gets each envelope that was created or changed status since the last check.",
  action: envelopeList,
  input: () => ({
    fromDate: fromDate(),
    orderBy: "status_changed",
    order: "desc",
    count: 100,
    startPosition: 0,
  }),
  items: envelopeItems,
  idOf: (item) => {
    const e = item as { envelopeId?: unknown; statusChangedDateTime?: unknown };
    return `${e.envelopeId ?? ""}:${e.statusChangedDateTime ?? ""}`;
  },
  output: envelopeOutput,
  sample: envelopeSample,
  maxPages: 1,
});
