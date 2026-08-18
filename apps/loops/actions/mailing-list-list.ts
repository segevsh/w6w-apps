import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `GET /v1/lists` — verified against Loops' OpenAPI document
 * (`listMailingLists`).
 *
 * **The one list endpoint that is not paged.** Every other collection here
 * answers `{pagination, data}`; this one answers a bare array with no cursor at
 * all, so it goes through `request` rather than `requestAll`.
 *
 * This is where the ids for the `mailingLists` field on contact writes and
 * events come from.
 */
const action: ActionDefinition = {
  key: "mailing-list-list",
  type: "read",
  resource: "mailing-list",
  title: "List mailing lists",
  description: "List mailing lists — the ids contact writes and events subscribe people to.",
  params: [],

  async execute(_input, ctx) {
    ctx.log("info", "listing Loops mailing lists", {});
    // A bare array, not the {pagination, data} envelope the others use.
    return await new LoopsClient(ctx).request("/lists");
  },
};

export default action;
