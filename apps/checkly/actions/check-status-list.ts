import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `GET /v1/check-statuses` — verified against Checkly's OpenAPI document
 * (`getV1Checkstatuses`).
 *
 * **This is the "is anything broken right now" endpoint**, and it is the one a
 * workflow usually wants rather than `check-result-list`: it returns the
 * current state of every check in one call, where the results endpoint returns
 * the history of one check.
 *
 * `hasFailures` and `hasErrors` are different: a *failure* is the monitored
 * thing being wrong (an assertion failed, the status code was not what you
 * asked for), while an *error* is the check itself not completing (the script
 * threw, the run timed out). A workflow paging someone for one and not the
 * other has to read both.
 *
 * Not paged — Checkly returns the whole set.
 */
const action: ActionDefinition = {
  key: "check-status-list",
  type: "read",
  resource: "check-status",
  title: "List current check statuses",
  description: "The current pass/fail state of every check, in one call.",
  params: [],

  async execute(_input, ctx) {
    ctx.log("info", "listing Checkly check statuses", {});
    // Unpaged: Checkly answers with the whole set.
    return await new ChecklyClient(ctx).request("/v1/check-statuses");
  },
};

export default action;
