import { snapshotTrigger } from "../lib/triggers.ts";
import candidateList from "../actions/candidate-list.ts";

// Without `page_size` the candidates endpoint returns every candidate on the position in one
// response (https://developer.breezy.hr/reference/listcandidates, verified 2026-11-10), so each
// check diffs the ids (snapshot, added only; the kit refuses more than 5000 rows).
export default snapshotTrigger<{ companyId: string; positionId: string }>({
  key: "new-position-candidate",
  title: "New Candidate on a Position",
  description: "The run gets each candidate newly added to the chosen position.",
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
    { key: "positionId", label: "Position ID", type: "string", required: true },
  ],
  async load(params, ctx) {
    const out = await candidateList.execute(
      { companyId: params.companyId, positionId: params.positionId },
      ctx,
    ) as { candidates?: unknown[] };
    return out.candidates ?? [];
  },
  idOf: (item) => String((item as { _id?: unknown })._id ?? ""),
  output: [
    { key: "_id", type: "string", label: "Candidate ID" },
    { key: "name", type: "string", label: "Candidate name" },
    { key: "email_address", type: "string", label: "Email" },
    { key: "creation_date", type: "string", label: "Created at" },
  ],
  sample: {
    _id: "cand-101",
    name: "Ada Lovelace",
    email_address: "ada@example.com",
    creation_date: "2026-11-01T10:00:00Z",
  },
});
