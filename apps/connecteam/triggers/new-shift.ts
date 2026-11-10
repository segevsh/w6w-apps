import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import shiftList from "../actions/shift-list.ts";

export default pollFromListAction<Parameters<NonNullable<typeof shiftList.execute>>[0]>({
  key: "new-shift",
  title: "New Shift",
  description: "Emit newly created shifts in a Connecteam schedule window.",
  action: shiftList as unknown as ActionDefinition,
  params: shiftList.params,
  input: (params) => ({ ...params, sort: "created_at", order: "desc", limit: 100, offset: 0 }),
  items: (result) => (result as { shifts?: unknown[] }).shifts ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Shift ID" }],
  sample: { id: "shift_1" },
});
