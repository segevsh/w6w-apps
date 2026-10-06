import type { ActionDefinition } from "@w6w/types";
import { filterQuery, UpsalesClient } from "../lib/client.ts";
import { listOutput, listParams } from "../lib/params.ts";

/**
 * `GET /api/v2/contacts` — List contacts in Upsales.
 *
 * Pages with `limit`/`offset` and accepts Upsales filters via `filter`.
 */
interface Input {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: unknown;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts in Upsales.",
  params: [
    ...listParams,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new UpsalesClient(ctx).list("/contacts", {
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
      ...filterQuery(input.filter),
    });
  },
};

export default contactList;
