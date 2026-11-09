import draftList from "../actions/draft-list.ts";
import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

interface Params {
  socialSetId: number;
}

export default pollFromListAction<Params>({
  key: "new-draft",
  title: "New Draft",
  description: "The run gets each newly created draft in a social set.",
  action: draftList as unknown as ActionDefinition,
  input: ({ socialSetId }) => ({ socialSetId, orderBy: "-created_at", limit: 50, offset: 0 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  params: [{ key: "socialSetId", label: "Social set ID", type: "number", required: true }],
  output: [{ key: "id", type: "number", label: "Draft ID" }],
  sample: { id: 1, status: "draft" },
  maxPages: 1,
});
