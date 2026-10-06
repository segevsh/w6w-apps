import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, toPage } from "../lib/client.ts";
import { cursorParam, pageOutput } from "../lib/params.ts";

interface Input {
  collection_id?: string;
  title_filter?: string;
  tag?: string;
  order_by?: string;
  cursor?: string;
}

/** `GET /templates` — 20 per page, cursor-paginated, optional filters and sort. */
const action: ActionDefinition<Input, ReturnType<typeof toPage>> = {
  key: "template-list",
  type: "search",
  resource: "template",
  title: "List Templates",
  description:
    "List the project's templates (uuid, title, thumbnail, tags and layers), 20 per page, optionally filtered by collection, title or tag.",
  params: [
    {
      key: "collection_id",
      label: "Collection ID",
      type: "string",
      hint: "Only templates in this collection.",
    },
    { key: "title_filter", label: "Title contains", type: "string" },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      hint: "Nested tags match: `social` also returns templates tagged `social/instagram`.",
    },
    {
      key: "order_by",
      label: "Order by",
      type: "select",
      options: [
        { value: "created_at-asc", label: "Created, oldest first" },
        { value: "created_at-desc", label: "Created, newest first" },
        { value: "updated_at-asc", label: "Updated, oldest first" },
        { value: "updated_at-desc", label: "Updated, newest first" },
        { value: "title-asc", label: "Title A-Z" },
        { value: "title-desc", label: "Title Z-A" },
      ],
    },
    cursorParam,
  ],
  output: [
    ...pageOutput,
  ],

  async execute(input, ctx) {
    const body = await new PlacidClient(ctx).json("/templates", {
      query: {
        collection_id: input.collection_id,
        title_filter: input.title_filter,
        tag: input.tag,
        order_by: input.order_by,
        cursor: input.cursor,
      },
    });
    return toPage(body);
  },
};

export default action;
