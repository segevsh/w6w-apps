import type { ActionDefinition } from "@w6w/types";
import routeRuleList from "../actions/route-rule-list.ts";
import { dataItems, idOrContent, snapshotTrigger } from "../lib/triggers.ts";

/** `GET /api/routes/{routeId}/rules` — the rules of one route the user picks; the OpenAPI lists
 * no paging, so one response is the whole bounded collection.
 * https://app.documerge.ai/api-docs/openapi.yaml */
export default snapshotTrigger({
  key: "new-route-rule",
  title: "New Route Rule",
  description: "The run gets each rule newly added to the chosen DocuMerge route.",
  action: routeRuleList as unknown as ActionDefinition,
  params: routeRuleList.params,
  input: (params) => ({ routeId: params.routeId }),
  items: dataItems,
  keyOf: idOrContent,
  output: [{ key: "id", type: "number", label: "Rule ID" }],
  sample: { id: 4 },
});
