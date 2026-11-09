import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/broadcast-list.ts";

const trigger = pollFromListAction({
  key: "new-broadcast",
  title: "New Broadcast",
  description: "The run gets each newly sent broadcast in the selected AWeber list.",
  action: action as unknown as ActionDefinition,
  input: (params) => ({ ...params, status: "sent", start: 0, size: 100 }),
  items: (result) => (result as { entries?: unknown[] }).entries ?? [],
  idOf: (item) =>
    String(
      (item as { id?: string | number; broadcast_id?: string | number }).id ??
        (item as { broadcast_id?: string | number }).broadcast_id,
    ),
  params: action.params,
  output: [{ key: "id", type: "string", label: "Broadcast ID" }],
  sample: { id: "1", subject: "A newly sent broadcast" },
  maxPages: 1,
});

export default trigger;
