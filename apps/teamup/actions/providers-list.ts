/**
 * `GET /api/v2/providers` — the businesses this credential can reach.
 *
 * A TeamUp M2M token belongs to one business, and a business can have several
 * locations ("providers"). Every other action in this app takes an optional
 * `providerId` that travels as the `TeamUp-Provider-ID` header, and **this is
 * how those ids are discovered**: read this list once, then pass the right
 * `providerId` on the actions that must act on one location rather than on the
 * token's own default.
 *
 * It is also the cheapest useful read in the API — one record — which is why
 * `auth/token.ts` reads it in `afterConnect` to label a Connection with the
 * business's name.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

type Input = ListInput;

const action: ActionDefinition<Input> = {
  key: "providers-list",
  type: "search",
  resource: "provider",
  title: "List Providers",
  description:
    "List the businesses and locations this M2M token can reach — where the providerId values come " +
    "from (GET /api/v2/providers).",
  params: listParams(),
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/providers", {
      query: {
        ...paginationQuery(input),
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
