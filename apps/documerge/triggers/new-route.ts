import type { ActionDefinition } from "@w6w/types";
import routeList from "../actions/route-list.ts";
import { dataItems, snapshotTrigger } from "../lib/triggers.ts";

/** `GET /api/routes` has no paging or filter parameters in the OpenAPI (the same reading as
 * `new-document`), so one response is the whole bounded collection and each check diffs the ids.
 * https://app.documerge.ai/api-docs/openapi.yaml */
export default snapshotTrigger({
  key: "new-route",
  title: "New Route",
  description: "The run gets each newly created DocuMerge route (a pack of documents).",
  action: routeList as unknown as ActionDefinition,
  input: () => ({}),
  items: dataItems,
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Route ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 13, name: "Onboarding pack" },
});
