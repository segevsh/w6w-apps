import { pollFromListAction } from "../../_shared/poll/mod.ts";
import envelopeList from "../actions/envelope-list.ts";

export default pollFromListAction({
  key: "new-envelope",
  title: "New Envelope",
  description: "The run gets each newly created envelope.",
  action: envelopeList,
  params: envelopeList.params,
  input: (params) => ({
    fromDate: String(params.fromDate ?? ""),
    orderBy: "created",
    order: "desc",
    count: 100,
    startPosition: 0,
  }),
  items: (result) => (result as { envelopes?: unknown[] }).envelopes ?? [],
  idOf: (item) => String((item as { envelopeId?: unknown }).envelopeId ?? ""),
  output: [{ key: "envelopeId", type: "string", label: "Envelope ID" }],
  sample: { envelopeId: "env-1" },
  maxPages: 1,
});
