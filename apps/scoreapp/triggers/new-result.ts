import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import resultList from "../actions/result-list.ts";

export default pollFromListAction({
  key: "new-result",
  title: "New Result",
  description: "The run gets each newly created scorecard result.",
  action: resultList as unknown as ActionDefinition,
  params: [{ key: "scorecard", label: "Scorecard", type: "string", required: true }],
  input: (params: { scorecard: string }) => ({
    scorecard: params.scorecard,
    limit: 100,
    order_by: "created_at",
    order_dir: "desc",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Result ID" }],
  sample: { id: "result-1" },
  maxPages: 1,
});
