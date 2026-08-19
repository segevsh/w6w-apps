import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `DELETE /keys/{id}` — revoke a key.
 *
 * ## Immediate, and there is no grace period
 *
 * The next request carrying that key gets a 401. For a search key embedded in
 * a deployed front end, that means every visitor's search stops working the
 * moment this runs — there is no staged rotation in Typesense, so the order is
 * always: create the new key, deploy it, *then* revoke the old one.
 *
 * ## This can revoke the key in your hand
 *
 * The connection's own key appears in `key-list` like any other. Revoking it
 * succeeds and then every later call 401s, which reads as an outage. There is
 * no way to compare a key id against the connection's credential from inside
 * an action — actions cannot read credentials — so this warns rather than
 * refuses, and `key-list` is where to look first.
 *
 * ## The bootstrap key is not in this list
 *
 * The server's `--api-key` is configuration, not a record. It cannot be
 * revoked through the API and it never expires, which is the argument for
 * never using it outside a bootstrap.
 */
const action: ActionDefinition = {
  key: "key-delete",
  type: "perform",
  resource: "key",
  title: "Revoke an API key",
  description:
    "Revoke a key, immediately and with no grace period — a search key in a deployed front end " +
    "stops working for every visitor at once, so create and deploy the replacement first. Note " +
    "the server's bootstrap `--api-key` cannot be revoked here at all.",
  idempotent: true,
  params: [
    {
      key: "keyId",
      label: "Key ID",
      type: "number",
      required: true,
      default: 0,
      hint: "From `key-list`. Not the key value — that is unrecoverable by design.",
    },
  ],
  output: [
    { key: "keyId", type: "number", label: "Which key" },
    { key: "description", type: "string", label: "What it was for" },
    { key: "actions", type: "array", label: "What it could do" },
    { key: "revoked", type: "boolean", label: "Whether it was revoked" },
    { key: "wasUnrestricted", type: "boolean", label: "Whether it could do anything, anywhere" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const keyId = Number(p.keyId ?? 0);
    if (!Number.isInteger(keyId) || keyId <= 0) {
      throw new Error("`keyId` must be the numeric id `key-list` reports");
    }

    const client = new TypesenseClient(ctx);
    const before = await client.request<{
      description?: string;
      actions?: string[];
      collections?: string[];
    }>(`/keys/${keyId}`);

    await client.request(`/keys/${keyId}`, { method: "DELETE" });

    const wasUnrestricted = (before?.actions ?? []).includes("*") &&
      (before?.collections ?? []).includes("*");

    ctx.log(
      "warn",
      "revoked a Typesense key — the next request carrying it gets a 401, with no grace period. " +
        "If this connection was using it, every later call fails in a way that reads as an outage",
      { keyId },
    );

    return {
      keyId,
      description: before?.description,
      actions: before?.actions ?? [],
      revoked: true,
      wasUnrestricted,
    };
  },
};

export default action;
