import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { paginationField } from "../lib/params.ts";

/**
 * `GET /v1/gifs/categories` — GIPHY's category tree.
 *
 * A `CategoryObject` list, each entry carrying its display name, a URL-encoded
 * form of that name, and a representative GIF. The list is what a picker UI
 * needs, so the output exposes the name, the encoded name, and the
 * representative GIF's original rendition — the fields worth reading, not every
 * field the schema declares.
 *
 * GIPHY documents no parameters on this endpoint, so this action declares none:
 * there is nothing to filter, page or localise.
 */
const getCategories: ActionDefinition<Record<string, never>> = {
  key: "get-categories",
  type: "read",
  title: "Get Categories",
  description: "List GIPHY's GIF categories, each with a representative GIF.",
  resource: "category",
  output: [
    { key: "data", type: "array", label: "Categories" },
    { key: "data[].name", type: "string", label: "Category name" },
    { key: "data[].name_encoded", type: "string", label: "Category name, URL-encoded" },
    {
      key: "data[].gif.images.original.url",
      type: "string",
      label: "Representative GIF, original rendition",
    },
    paginationField(),
  ],

  async execute(_input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown[]>("/gifs/categories");
    return { data: body.data ?? [], pagination: body.pagination };
  },
};

export default getCategories;
