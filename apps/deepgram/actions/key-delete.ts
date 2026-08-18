import type { ActionDefinition } from "@w6w/types";
import { DeepgramClient } from "../lib/client.ts";

/**
 * `DELETE /v1/projects/{id}/keys/{key_id}` — revoke a key immediately.
 *
 * This is the action worth automating: a key found in a commit, a contractor
 * leaving, a rotation finishing. Revocation takes effect at once and there is
 * no undo — the value was only ever shown at creation, so a deleted key cannot
 * be restored, only replaced.
 *
 * Which is also why it is gated. **Deleting the key this connection itself
 * uses breaks the connection**, and every workflow on it, in a way that is
 * obvious afterwards and easy to do by accident when iterating over
 * `key-list`. There is no way from here to tell which id the current credential
 * corresponds to — Deepgram does not report it — so the confirmation is the
 * guard, and the hint says exactly what to check.
 */
const action: ActionDefinition = {
  key: "key-delete",
  type: "perform",
  resource: "key",
  title: "Delete an API key",
  description:
    "Revoke a key immediately and permanently. Deleting the one this connection uses breaks it " +
    "and every workflow on it — and nothing in the API says which id that is.",
  idempotent: true,
  params: [
    { key: "apiKeyId", label: "API Key ID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "I have checked this is not the key in use",
      type: "boolean",
      required: true,
      default: false,
      hint: "Revocation is immediate and cannot be undone — a key's value is shown once, so a " +
        "deleted key can only be replaced. Deepgram does not report which id a connection uses.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Revoked" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const apiKeyId = String(p.apiKeyId ?? "").trim();
    if (!apiKeyId) throw new Error("`apiKeyId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` — revoking a key is immediate and permanent, and deleting the one this " +
          "connection uses breaks every workflow on it",
      );
    }

    const client = new DeepgramClient(ctx);
    ctx.log("warn", "revoking a Deepgram API key", { apiKeyId });
    await client.request(
      `/v1/projects/${encodeURIComponent(client.projectId)}/keys/${encodeURIComponent(apiKeyId)}`,
      { method: "DELETE" },
    );
    return { ok: true };
  },
};

export default action;
