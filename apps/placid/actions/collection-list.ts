import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, toPage } from "../lib/client.ts";
import { cursorParam, pageOutput, perPageParam } from "../lib/params.ts";

interface Input {
  per_page?: number;
  cursor?: string;
}

/** `GET /collections` — every collection by default; with `per_page` or `cursor` the response is cursor-paginated. */
const action: ActionDefinition<Input, ReturnType<typeof toPage>> = {
  key: "collection-list",
  type: "search",
  resource: "collection",
  title: "List Collections",
  description:
    "List template collections. Without a page size Placid returns all of them; set one to paginate.",
  params: [
    perPageParam,
    cursorParam,
  ],
  output: [
    ...pageOutput,
  ],

  async execute(input, ctx) {
    const body = await new PlacidClient(ctx).json("/collections", {
      query: { per_page: input.per_page, cursor: input.cursor },
    });
    return toPage(body);
  },
};

export default action;
