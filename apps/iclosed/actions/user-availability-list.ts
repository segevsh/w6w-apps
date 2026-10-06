import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/userAvailabilities` — List weekly availability schedules, optionally for one user.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  userId?: number;
}

const userAvailabilityList: ActionDefinition<Input> = {
  key: "user-availability-list",
  type: "read",
  resource: "user",
  title: "List user availabilities",
  description: "List weekly availability schedules, optionally for one user.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "number",
      validation: { integer: true },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Availability schedules" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/userAvailabilities", { query: { userId: input.userId } });
  },
};

export default userAvailabilityList;
