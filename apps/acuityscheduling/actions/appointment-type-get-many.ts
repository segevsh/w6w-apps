import type { ActionDefinition } from "@w6w/types";
import { AcuityClient } from "../lib/client.ts";

interface Input {
  includeDeleted?: boolean;
}

/**
 * GET /appointment-types — the account's bookable appointment types.
 */
const appointmentTypeGetMany: ActionDefinition<Input, unknown[]> = {
  key: "appointment-type-get-many",
  type: "read",
  resource: "appointment-type",
  title: "List Appointment Types",
  description: "List the account's appointment types (GET /appointment-types).",
  params: [
    {
      key: "includeDeleted",
      label: "Include deleted",
      type: "boolean",
      default: false,
      hint: "Also include deleted appointment types in the response.",
    },
  ],
  output: [{ key: "", type: "array", label: "Appointment types" }],

  execute(input, ctx) {
    return new AcuityClient(ctx).request<unknown[]>("/appointment-types", {
      query: { includeDeleted: input.includeDeleted },
    });
  },
};

export default appointmentTypeGetMany;
