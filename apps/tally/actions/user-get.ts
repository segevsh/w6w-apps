import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";

interface Input {
  timezone?: string;
}

/**
 * GET /users/me — the account this API key belongs to.
 *
 * Also the only place `organizationId` is published, which every
 * `organization-*` action needs as a path segment.
 */
const userGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Retrieve the authenticated user, including `organizationId` and `subscriptionPlan`.",
  params: [
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "Optional IANA timezone, e.g. `Europe/Brussels`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "fullName", type: "string", label: "Full name" },
    { key: "organizationId", type: "string", label: "Organization ID" },
    { key: "subscriptionPlan", type: "string", label: "Subscription plan" },
    { key: "user", type: "object", label: "The full user object" },
  ],

  async execute(input, ctx) {
    const user = await new TallyClient(ctx).request<Record<string, unknown>>("/users/me", {
      query: { timezone: input.timezone },
    });
    return {
      id: user?.id,
      email: user?.email,
      fullName: user?.fullName,
      organizationId: user?.organizationId,
      subscriptionPlan: user?.subscriptionPlan,
      user,
    };
  },
};

export default userGet;
