import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import candidateSearch from "../actions/candidate-search.ts";

export default pollFromListAction({
  key: "new-candidate",
  title: "New Candidate",
  description: "The run gets each newly created candidate matching the search query.",
  action: candidateSearch as unknown as ActionDefinition,
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "Candidate search terms; only candidates matching are watched.",
    },
  ],
  input: (params: { companyId: string; query: string }) => ({
    companyId: params.companyId,
    query: params.query,
    sort: "created",
    pageSize: 50,
    page: 1,
  }),
  items: (result) => {
    const candidates = (result as { candidates?: unknown[] }).candidates;
    return Array.isArray(candidates) ? candidates : [];
  },
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Candidate ID" },
    { key: "name", type: "string", label: "Candidate name" },
  ],
  sample: { _id: "cand-new", name: "Ada Lovelace" },
  maxPages: 1,
});
