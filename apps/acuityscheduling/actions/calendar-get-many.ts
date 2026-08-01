import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

/**
 * GET /calendars — every calendar this credential has access to. Takes no
 * query parameters.
 */
const calendarGetMany: ActionDefinition<Input, unknown[]> = {
  key: "calendar-get-many",
  type: "read",
  resource: "calendar",
  title: "List Calendars",
  description: "List calendars this account has access to (GET /calendars).",
  params: [],
  output: [{ key: "", type: "array", label: "Calendars" }],

  execute(_input, ctx) {
    return new AcuityClient(ctx).request<unknown[]>("/calendars");
  },
};

export default calendarGetMany;
