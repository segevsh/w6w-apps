import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { fromDateParam, nextParam, pageOutput, requireRange, toDateParam } from "../lib/params.ts";

/**
 * `GET /v1/calls/` — calls (dialer-sourced meetings) in a date window. The spec documents no
 * `page_size` here, so none is offered; follow `next`. `direction` is a free string in the
 * spec (`inbound` / `outbound` in its own words); it is passed through as typed.
 */
interface Input {
  fromDate?: string;
  toDate?: string;
  direction?: string;
  next?: string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "search",
  resource: "call",
  title: "List Calls",
  description: "List calls (from a connected dialer or created through the API) that started " +
    "inside a date window.",
  params: [
    fromDateParam(true, "Calls"),
    toDateParam(true, "Calls"),
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "inbound", label: "Inbound" },
        { value: "outbound", label: "Outbound" },
      ],
      hint: "Leave empty for both.",
    },
    nextParam,
  ],
  output: pageOutput,

  execute(input, ctx) {
    requireRange(input);
    return new AvomaClient(ctx).list("/v1/calls/", {
      from_date: input.fromDate,
      to_date: input.toDate,
      direction: input.direction,
    }, input.next);
  },
};

export default callList;
