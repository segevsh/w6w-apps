import type { ActionDefinition } from "@w6w/types";
import { tailnetFrom, TailscaleClient } from "../lib/client.ts";

/**
 * `DELETE /api/v2/tailnet/{tailnet}/keys/{keyId}` — revoke a key.
 *
 * ## What revoking does, and does not, do
 *
 * The key stops working: nothing new can join with it. **Machines already
 * joined stay joined** — they hold their own node keys now, and removing the
 * key they arrived with does not evict them. Getting a machine out is
 * `device-delete`, and doing both is what "revoke this credential completely"
 * actually means.
 *
 * The exception is ephemeral devices, which are tied to their key: revoking it
 * removes them.
 *
 * ## This can revoke the credential in your hand
 *
 * The API tokens and OAuth clients this connection might be using appear in
 * `key-list` alongside auth keys, and this endpoint deletes any of them. A
 * workflow that revokes its own credential succeeds, and then every subsequent
 * call fails with a 401 that looks like an outage. The action refuses when the
 * key it was given is an `api` or `client` key unless told explicitly, because
 * that is almost never what somebody meant to automate.
 */
const action: ActionDefinition = {
  key: "key-delete",
  type: "perform",
  resource: "key",
  title: "Revoke a key",
  description:
    "Stop a key admitting anything new. Machines that ALREADY JOINED stay joined — they hold " +
    "their own node keys — so evicting one is `device-delete`. Refuses to revoke an API token or " +
    "OAuth client without an explicit acknowledgement, since that may be this connection's own.",
  idempotent: true,
  params: [
    {
      key: "keyId",
      label: "Key ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `key-list`. Not the key secret — that is unrecoverable by design.",
    },
    {
      key: "allowCredentialKey",
      label: "Allow revoking an API token or OAuth client",
      type: "boolean",
      default: false,
      hint: "These are what programs authenticate with, possibly including this connection.",
    },
  ],
  output: [
    { key: "keyId", type: "string", label: "Which key" },
    { key: "keyType", type: "string", label: "auth, api or client" },
    { key: "description", type: "string", label: "What it was for" },
    { key: "revoked", type: "boolean", label: "Whether it was revoked" },
    { key: "devicesStayJoined", type: "boolean", label: "True for a non-ephemeral auth key" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tailnet = tailnetFrom(ctx.connection);
    const keyId = String(p.keyId ?? "").trim();
    if (!keyId) throw new Error("`keyId` is required");

    const client = new TailscaleClient(ctx);
    const before = await client.request<{
      keyType?: string;
      description?: string;
      capabilities?: { devices?: { create?: { ephemeral?: boolean } } };
    }>(`/tailnet/${encodeURIComponent(tailnet)}/keys/${encodeURIComponent(keyId)}`);

    const keyType = String(before?.keyType ?? "auth");
    // Revoking the credential in your hand succeeds, then everything 401s.
    if (keyType !== "auth" && p.allowCredentialKey !== true) {
      throw new Error(
        `key ${keyId} is a \`${keyType}\` key — an API access token or OAuth client, which is ` +
          "what programs authenticate with and possibly what this very connection uses. " +
          "Revoking it succeeds and then every later call fails with a 401 that looks like an " +
          "outage. Set `allowCredentialKey` if that is intended",
      );
    }

    await client.request(
      `/tailnet/${encodeURIComponent(tailnet)}/keys/${encodeURIComponent(keyId)}`,
      { method: "DELETE" },
    );

    const ephemeral = before?.capabilities?.devices?.create?.ephemeral === true;
    if (keyType === "auth" && !ephemeral) {
      ctx.log(
        "info",
        "revoked an auth key — machines that already joined with it keep their " +
          "access, because they hold their own node keys now",
        { keyId },
      );
    }

    return {
      keyId,
      keyType,
      description: before?.description,
      revoked: true,
      devicesStayJoined: keyType === "auth" && !ephemeral,
    };
  },
};

export default action;
