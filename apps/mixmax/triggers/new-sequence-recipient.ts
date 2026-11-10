import { pollFromListAction } from "../../_shared/poll/mod.ts";
import sequenceSearch from "../actions/sequence-search.ts";

// GET /sequences/search with neither `query` nor `recipients` returns every recipient the user can
// see; `sortBy=createdAt&sortDesc=true` puts the most recently added first, 50 at most per page
// (https://developer.mixmax.com/reference/sequencessearch), so page 1 is the feed.
export default pollFromListAction<{ sequenceId?: string }>({
  key: "new-sequence-recipient",
  title: "New Sequence Recipient",
  description:
    "The run gets each recipient newly added to a sequence (optionally in one sequence).",
  action: sequenceSearch,
  params: [{
    key: "sequenceId",
    label: "Sequence ID",
    type: "string",
    hint: "Only recipients of this sequence. Leave empty for every sequence you can access.",
  }],
  input: (p) => ({
    sequenceId: p.sequenceId || undefined,
    sortBy: "createdAt",
    sortDesc: true,
    limit: 50,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Recipient ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "sequenceId", type: "string", label: "Sequence ID" },
    { key: "createdAt", type: "number", label: "Added at (Unix seconds)" },
  ],
  sample: {
    _id: "recipient-sample-1",
    email: "ada@example.test",
    sequenceId: "sequence-sample-1",
    createdAt: 1762765200,
  },
  maxPages: 1,
});
