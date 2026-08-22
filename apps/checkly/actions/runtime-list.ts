import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `GET /v1/runtimes` — verified against Checkly's OpenAPI document
 * (`getV1Runtimes`).
 *
 * A runtime is the Node version and the set of libraries a browser or API check
 * script can import. It matters because **Checkly retires runtimes**: a check
 * pinned to an old one keeps working until it does not, and a check on the
 * account default silently moves when the default does. This is how a workflow
 * finds out which are still current.
 */
const action: ActionDefinition = {
  key: "runtime-list",
  type: "read",
  resource: "runtime",
  title: "List runtimes",
  description: "The Node runtimes and bundled libraries check scripts can use.",
  params: [],

  async execute(_input, ctx) {
    ctx.log("info", "listing Checkly runtimes", {});
    return await new ChecklyClient(ctx).request("/v1/runtimes");
  },
};

export default action;
