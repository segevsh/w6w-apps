import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/call-list.ts";

export default pollFromListAction<{ modelId: string }>({
  key: "new-call",
  title: "New Call",
  description: "The run gets each newly created call for the selected Synthflow agent.",
  action: action as unknown as ActionDefinition,
  input: ({ modelId }) => ({ model_id: modelId, limit: 100, offset: 0 }),
  params: [{ key: "modelId", label: "Agent ID", type: "string", required: true }],
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String(
      (item as { call_id?: unknown; id?: unknown }).call_id ?? (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "id", type: "string", label: "Call ID" }],
  sample: { id: "call_101", created_at: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
