import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listDatapoints from "../actions/list-datapoints.ts";

export default pollFromListAction({
  key: "new-datapoint",
  title: "New Datapoint",
  description: "The run gets each new datapoint for the selected goal.",
  action: listDatapoints as unknown as ActionDefinition,
  params: [
    { key: "username", label: "Username", type: "string" },
    { key: "slug", label: "Goal slug", type: "string", required: true },
  ],
  input: (params: { username?: string; slug: string }) => ({
    username: params.username,
    slug: params.slug,
    sort: "id",
    count: 100,
  }),
  items: (result) => (result as { datapoints?: unknown[] }).datapoints ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Datapoint ID" }],
  sample: { id: "dp-new" },
  maxPages: 1,
});
