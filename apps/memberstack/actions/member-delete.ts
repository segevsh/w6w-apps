import type { ActionDefinition } from "@w6w/types";
import { MemberstackClient } from "../lib/client.ts";
import { memberIdParam } from "../lib/params.ts";

/**
 * `DELETE /members/:id` — permanent. The optional body flags `deleteStripeCustomer` and
 * `cancelStripeSubscriptions` (both default false) reach into Stripe. An unknown member
 * answers `400 "There is no member with this identifier."`, which surfaces as an error.
 */
interface Input {
  memberId: string;
  deleteStripeCustomer?: boolean;
  cancelStripeSubscriptions?: boolean;
}

const memberDelete: ActionDefinition<Input> = {
  key: "member-delete",
  type: "perform",
  resource: "member",
  title: "Delete Member",
  description: "Permanently delete a member. Cannot be undone.",
  idempotent: true,
  params: [
    memberIdParam,
    {
      key: "deleteStripeCustomer",
      label: "Delete Stripe customer",
      type: "boolean",
      default: false,
    },
    {
      key: "cancelStripeSubscriptions",
      label: "Cancel Stripe subscriptions",
      type: "boolean",
      default: false,
    },
  ],
  output: [{ key: "id", type: "string", label: "Deleted member ID" }],

  async execute(input, ctx) {
    const flags: Record<string, boolean> = {};
    if (input.deleteStripeCustomer) flags.deleteStripeCustomer = true;
    if (input.cancelStripeSubscriptions) flags.cancelStripeSubscriptions = true;
    const body = await new MemberstackClient(ctx).json<{ data?: { id?: string } }>(
      `/members/${encodeURIComponent(input.memberId)}`,
      {
        method: "DELETE",
        body: Object.keys(flags).length > 0 ? flags : undefined,
      },
    );
    return { id: body?.data?.id ?? input.memberId };
  },
};

export default memberDelete;
