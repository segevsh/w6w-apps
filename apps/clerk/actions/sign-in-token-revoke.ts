import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "sign-in-token-revoke",
  type: "perform",
  resource: "sign-in-token",
  title: "Revoke sign-in token",
  description: "Revoke a pending sign-in token before it is redeemed.",
  idempotent: true,
  params: [
    {
      key: "signInTokenId",
      label: "Sign-in token ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Sign-in token ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const id = String((input as Record<string, unknown>).signInTokenId ?? "").trim();
    if (!id) throw new Error("`signInTokenId` is required");
    return await new ClerkClient(ctx).request(`/sign_in_tokens/${encodeURIComponent(id)}/revoke`, {
      method: "POST",
    });
  },
};
export default action;
