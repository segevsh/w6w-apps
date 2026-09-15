import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/**
 * `POST /rewards/{id}/generate_link` — generate a fresh redemption link for a
 * reward.
 *
 * For an order sent with delivery method `LINK`, the initial `POST /orders`
 * response already includes the link at `delivery.link` (see `order-create`);
 * this action is for obtaining a NEW one afterwards — the vendor's own
 * `link-delivery` guide names re-issuing a link as its purpose. The returned
 * link must still be delivered to the recipient out-of-band (email, chat, a
 * support ticket reply); Tremendous does not send it anywhere itself.
 */
interface Input {
  id: string;
}

const rewardGenerateLink: ActionDefinition<Input> = {
  key: "reward-generate-link",
  type: "perform",
  resource: "reward",
  title: "Generate Reward Link",
  description: "Generate a fresh redemption link for a reward. Deliver it yourself.",
  idempotent: false,
  params: [{ key: "id", label: "Reward ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Reward ID" },
    { key: "link", type: "string", label: "Redemption link" },
  ],

  async execute(input, ctx) {
    const body = await new TremendousClient(ctx).json<{ reward: { id: string; link: string } }>(
      `/rewards/${encodeURIComponent(input.id)}/generate_link`,
      { method: "POST" },
    );
    return body.reward;
  },
};

export default rewardGenerateLink;
