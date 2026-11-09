import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listOpportunities from "../actions/list-opportunities.ts";

export default pollFromListAction<Parameters<NonNullable<typeof listOpportunities.execute>>[0]>({
  key: "new-opportunity",
  title: "New Opportunity",
  description: "Emit newly created Close opportunities.",
  action: listOpportunities as unknown as ActionDefinition,
  params: listOpportunities.params,
  input: (params) => ({ ...params, orderBy: "-date_created", skip: 0, limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Opportunity ID" }],
  sample: { id: "oppo_1" },
});
