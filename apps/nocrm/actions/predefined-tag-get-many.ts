import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, type NocrmPage, V2 } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

/** No input: the List-the-predefined-tags section documents no parameters. */
type Input = Record<string, never>;

/**
 * `GET /api/v2/predefined_tags` — list the account's predefined tags.
 *
 * The List-the-predefined-tags section of noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) documents no parameters and its
 * sample response carries `id`, `name`, `category`, `category_id`, `position`
 * and `created_at`. The status table is unusual in naming an extra 401 type —
 * `unauthorized_non_admin` — which is why a USER-token connection may be
 * refused here even when `ping` succeeds.
 *
 * This is the list behind the "Predefined tags" the lead endpoints accept, so
 * it is the read a tag-picking workflow resolves its names against.
 */
const predefinedTagGetMany: ActionDefinition<Input, NocrmPage> = {
  key: "predefined-tag-get-many",
  type: "search",
  resource: "predefined-tag",
  title: "List Predefined Tags",
  description:
    "List the account's predefined tags with their category (GET /api/v2/predefined_tags).",
  params: [],
  output: listOutput("Predefined tags"),

  execute(_input, ctx) {
    return new NocrmClient(ctx).list(`${V2}/predefined_tags`);
  },
};

export default predefinedTagGetMany;
