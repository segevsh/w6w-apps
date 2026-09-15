import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /sign_in_tokens` — this is Clerk's documented way for a backend to hand a specific user a
 * live session without touching a password: mint a token here, then redirect the user to a URL
 * that consumes it. `POST /sessions` (Sessions resource) exists but Clerk's own docs mark it
 * testing-only and unavailable on production instances — this is the production-safe equivalent.
 */
const action: ActionDefinition = {
  key: "sign-in-token-create",
  type: "perform",
  resource: "sign-in-token",
  title: "Create sign-in token",
  description: "Mint a one-time sign-in token for a user, redeemable to start a session without " +
    "a password.",
  idempotent: false,
  params: [
    USER_ID_PARAM,
    {
      key: "organizationId",
      label: "Organization ID to activate",
      type: "string",
      default: "",
      hint: "Organizations must be enabled for the instance, and the user must already be a " +
        "member.",
    },
    {
      key: "expiresInSeconds",
      label: "Expires in (seconds)",
      type: "number",
      default: 2592000,
      advanced: true,
      hint: "Defaults to 30 days.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Sign-in token ID" },
    { key: "token", type: "string", label: "Token" },
    { key: "url", type: "string", label: "Redemption URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");

    ctx.log("info", "minting a Clerk sign-in token", { userId });
    return await new ClerkClient(ctx).request("/sign_in_tokens", {
      method: "POST",
      body: compact({
        user_id: userId,
        org_id: p.organizationId,
        expires_in_seconds: p.expiresInSeconds,
      }),
    });
  },
};
export default action;
