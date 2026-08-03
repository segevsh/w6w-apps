import type { ActionDefinition } from "@w6w/types";
import {
  FlodeskClient,
  type FlodeskList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

type Input = PageInput;

const listSegments: ActionDefinition<Input> = {
  key: "list-segments",
  type: "search",
  resource: "segment",
  title: "List Segments",
  description:
    "List segments one page at a time. Each carries `id`, `name`, `color` and `total_active_subscribers`. Returns `{ meta, data }`.",
  params: [...PAGE_PARAMS],
  output: [
    { key: "data", type: "array", label: "Segments" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request<FlodeskList>("/segments", {
      query: pageQuery(input),
    });
  },
};

export default listSegments;
