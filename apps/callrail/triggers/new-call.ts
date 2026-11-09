import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import callList from "../actions/call-list.ts";

export default pollFromListAction<Parameters<NonNullable<typeof callList.execute>>[0]>({
  key: "new-call",
  title: "New Call",
  description: "Emit calls newly recorded by CallRail for an account.",
  action: callList as unknown as ActionDefinition,
  params: callList.params,
  input: (params) => ({ ...params, sort: "start_time", order: "desc", page: 1, perPage: 100 }),
  items: (result) => (result as { calls?: unknown[] }).calls ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Call ID" }],
  sample: { id: "CAL1" },
});
