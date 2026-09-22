import type { ActionDefinition } from "@w6w/types";
import {
  type Page,
  type PageInput,
  pageOutput,
  pageParams,
  pageQuery,
  PracticeBetterClient,
} from "../lib/client.ts";

/**
 * `GET /tags` — list the practice's tags.
 *
 * Security: `[read]`. Pagination is the shared four-control shape every list
 * endpoint here declares (see `lib/client.ts`).
 *
 * Note the path: tags sit at the API root (`/tags`), not under `/consultant`,
 * which is where most of this app's reads live. The document gives this
 * operation no other parameter, so it is a flat page of tag objects.
 */
interface Input extends PageInput {}

const listTags: ActionDefinition<Input, Page<unknown>> = {
  key: "list-tags",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List the tags used to organize clients.",
  params: [...pageParams],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/tags", { query: pageQuery(input) });
  },
};

export default listTags;
