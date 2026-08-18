import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systemusers/{id}/sshkeys` (V1) — verified against JumpCloud's V1
 * OpenAPI document (`sshkey_post`; required `name` and `public_key`).
 *
 * **This grants shell access to every device the user is bound to**, not to one
 * machine — that is what JumpCloud's key distribution is. It is a grant, so it
 * logs at `warn` and is honest about not being idempotent: posting the same key
 * twice creates a second entry rather than merging.
 */
const action: ActionDefinition = {
  key: "user-sshkey-add",
  type: "perform",
  resource: "user",
  title: "Add an SSH key to a user",
  description: "Push a public SSH key to every device this user is bound to.",
  idempotent: false,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, default: "" },
    {
      key: "name",
      label: "Key Name",
      type: "string",
      required: true,
      default: "",
      hint: "A label. JumpCloud does not enforce uniqueness, so make it identify the machine.",
    },
    {
      key: "publicKey",
      label: "Public Key",
      type: "text",
      required: true,
      default: "",
      placeholder: "ssh-ed25519 AAAA… ada@laptop",
      hint: "The PUBLIC half only, in authorized_keys format.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Key ID" },
    { key: "name", type: "string", label: "Key name" },
    { key: "public_key", type: "string", label: "Public key" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.userId ?? "").trim();
    if (!id) throw new Error("`userId` is required");
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const publicKey = String(p.publicKey ?? "").trim();
    if (!publicKey) throw new Error("`publicKey` is required");
    // A private key pasted here would be distributed to the fleet as if public.
    if (publicKey.includes("PRIVATE KEY")) {
      throw new Error("`publicKey` looks like a PRIVATE key — send the public half only");
    }

    ctx.log("warn", "granting SSH access via a JumpCloud user key", { id, name });

    return await new JumpCloudClient(ctx).request(
      `/systemusers/${encodeURIComponent(id)}/sshkeys`,
      { method: "POST", body: { name, public_key: publicKey } },
    );
  },
};

export default action;
