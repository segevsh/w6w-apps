import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  requestableOnly?: boolean;
}

/**
 * `GET /api/v1/meta/time_off/types` — the company's time off types.
 *
 * This is the lookup Create Time Off Request depends on: `timeOffTypeId` is
 * required there and there is no other way to discover a valid value. It is
 * included for that reason rather than for completeness.
 *
 * The single documented parameter is `mode`, whose only accepted value is
 * `request`: "Set to `request` to limit the results to time off types the
 * authenticated employee can request." Since the parameter has exactly one legal
 * value, exposing it as a raw string invites typos that silently return the
 * unfiltered list — so it is a boolean here and the literal is emitted by the
 * action.
 */
const listTimeOffTypes: ActionDefinition<Input> = {
  key: "list-time-off-types",
  type: "search",
  resource: "time-off-type",
  title: "List Time Off Types",
  description:
    "List the company's time off types. Use this to find the `timeOffTypeId` required by Create " +
    "Time Off Request.",
  params: [
    {
      key: "requestableOnly",
      label: "Only types the key holder can request",
      type: "boolean",
      hint: "Limits the list to time off types the authenticated employee is allowed to request. " +
        "(Sends the documented `mode=request`.)",
    },
  ],
  output: [{ key: "timeOffTypes", type: "array", label: "Time off types" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request("/meta/time_off/types", {
      query: { mode: input.requestableOnly ? "request" : undefined },
    });
  },
};

export default listTimeOffTypes;
