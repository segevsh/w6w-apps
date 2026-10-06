import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient } from "../lib/client.ts";

/** `GET /v1/annotations` — List the annotations shown on the account's graphs. */
interface Input {
  per_page?: number;
  page?: number;
}

const annotationsList: ActionDefinition<Input> = {
  key: "annotations-list",
  type: "search",
  resource: "annotation",
  title: "List Annotations",
  description: "List the annotations shown on the account's graphs.",
  params: [
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      hint: "Objects per page. Vendor default 30, maximum 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number; the vendor's pagination meta starts at 0.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "annotations", type: "array", label: "Annotations" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("GET", "/annotations", {
      query: { per_page: input.per_page, page: input.page },
    });
  },
};

export default annotationsList;
