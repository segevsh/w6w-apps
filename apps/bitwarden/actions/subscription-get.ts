import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get the subscription",
  description:
    "Seat, storage and autoscale limits for Password Manager and Secrets Manager. Any field may be null (not applicable to the plan).",
  params: [],
  output: [
    {
      key: "passwordManager",
      type: "object",
      label: "Password Manager seats/storage/autoscale limit",
    },
    {
      key: "secretsManager",
      type: "object",
      label: "Secrets Manager seats/service accounts/autoscale limits",
    },
  ],

  async execute(input, ctx) {
    void input;
    const sub = await new BitwardenClient(ctx).request<Record<string, unknown>>(
      "/organization/subscription",
    );
    return {
      passwordManager: sub?.passwordManager ?? null,
      secretsManager: sub?.secretsManager ?? null,
    };
  },
};

export default action;
