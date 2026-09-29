import type { ActionDefinition } from "@w6w/types";
import { SharetribeClient } from "../lib/client.ts";
import { createdAtRangeParams, includeParam, listOutput, paginationParams } from "../lib/params.ts";

interface Input {
  createdAtStart?: string;
  createdAtEnd?: string;
  sort?: string;
  include?: string;
  page?: number;
  perPage?: number;
}

/**
 * `GET /v1/integration_api/users/query` — all marketplace users, newest first by default.
 *
 * Extended-data filters (`pub_*`/`priv_*`/`prot_*`/`meta_*`) are not exposed as static params —
 * they depend entirely on each marketplace's own configured extended-data schema, which this
 * app has no way to introspect. Use the plain filters here, or a downstream Function step, for
 * anything schema-specific.
 */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "Query all marketplace users, sorted by createdAt (newest first) by default.",
  params: [
    ...createdAtRangeParams(),
    {
      key: "sort",
      label: "Sort",
      type: "string",
      placeholder: "createdAt",
      hint: 'Comma-separated, up to 3 attributes. Prefix with "-" to reverse, e.g. "-createdAt".',
    },
    includeParam,
    ...paginationParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new SharetribeClient(ctx).query("/users/query", {
      createdAtStart: input.createdAtStart,
      createdAtEnd: input.createdAtEnd,
      sort: input.sort,
      include: input.include,
      page: input.page,
      perPage: input.perPage,
    });
  },
};

export default userList;
