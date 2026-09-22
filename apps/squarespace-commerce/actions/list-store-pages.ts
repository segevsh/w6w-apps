import type { ActionDefinition } from "@w6w/types";
import { API_V1, SquarespaceClient } from "../lib/client.ts";
import { cursorParam, paginationOutput } from "../lib/params.ts";

/**
 * `GET /1.0/commerce/store_pages` — the site's store pages.
 *
 * A store page is the container a product is published into, and its `id` is
 * the `storePageId` that **create product requires** (`CreatePhysicalProductRequest`,
 * `CreateServiceProductRequest` and `CreateGiftCardProductRequest` all mark
 * `storePageId` required). So in practice this is the action you run before
 * creating anything.
 *
 * Note the path's spelling: `store_pages`, with an underscore. Every other
 * Commerce path uses hyphens or a single word; this one is the vendor's own.
 */
export interface StorePage {
  id?: string;
  isEnabled?: boolean;
  title?: string;
  urlSlug?: string;
}

export interface StorePagesPage {
  pagination?: { hasNextPage?: boolean; nextPageCursor?: string; nextPageUrl?: string };
  storePages?: StorePage[];
}

interface Input {
  cursor?: string;
}

const listStorePages: ActionDefinition<Input, StorePagesPage> = {
  key: "list-store-pages",
  type: "search",
  resource: "store-page",
  title: "List Store Pages",
  description:
    "List the website's store pages. A page's `id` is the `storePageId` that creating a " +
    "product requires.",
  params: [cursorParam()],
  output: [paginationOutput, {
    key: "storePages",
    type: "array",
    label: "Store pages (`id`, `isEnabled`, `title`, `urlSlug`)",
  }],

  execute(input, ctx) {
    return new SquarespaceClient(ctx).get<StorePagesPage>(`${API_V1}/commerce/store_pages`, {
      cursor: input.cursor,
    });
  },
};

export default listStorePages;
