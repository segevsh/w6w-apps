import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/** `GET /rewards/{id}` — retrieve one reward, including its delivery status. */
interface Input {
  id: string;
}

const rewardGet: ActionDefinition<Input> = {
  key: "reward-get",
  type: "read",
  resource: "reward",
  title: "Get Reward",
  description: "Retrieve one reward by its Tremendous ID, including its delivery status.",
  params: [{ key: "id", label: "Reward ID", type: "string", required: true }],
  output: [{ key: "reward", type: "object", label: "The reward" }],

  async execute(input, ctx) {
    const body = await new TremendousClient(ctx).json<{ reward: unknown }>(
      `/rewards/${encodeURIComponent(input.id)}`,
    );
    return body.reward;
  },
};

export default rewardGet;
