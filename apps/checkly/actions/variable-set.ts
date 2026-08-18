import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `POST /v1/variables` and `PUT /v1/variables/{key}` — verified against
 * Checkly's OpenAPI document (`postV1Variables`, `putV1VariablesKey`).
 *
 * Environment variables are what a check script reads for credentials, base
 * URLs and feature flags, so this is how a deploy workflow points monitoring at
 * a new release.
 *
 * **`secret` is permanent and one-way.** A variable created as secret can be
 * overwritten but never read back — `variable-list` returns its key with the
 * value hidden. That is the point, and it means a secret written by mistake
 * cannot be inspected to find out what it was.
 *
 * Create and update are one action because the caller almost never knows or
 * cares which applies: this tries the update and falls back to the create,
 * rather than making a re-run of a deploy workflow fail on a variable that
 * already exists.
 */
const action: ActionDefinition = {
  key: "variable-set",
  type: "perform",
  resource: "variable",
  title: "Set an environment variable",
  description: "Create or update a variable checks can read. Secret values cannot be read back.",
  idempotent: true,
  params: [
    {
      key: "key",
      label: "Key",
      type: "string",
      required: true,
      default: "",
      placeholder: "BASE_URL",
    },
    { key: "value", label: "Value", type: "secret", required: true, default: "" },
    {
      key: "secret",
      label: "Secret",
      type: "boolean",
      default: false,
      hint: "PERMANENT and one-way: a secret variable can be overwritten but never read back.",
    },
    {
      key: "locked",
      label: "Locked",
      type: "boolean",
      default: false,
      hint: "Hidden from check logs and the editor.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "Key" },
    { key: "secret", type: "boolean", label: "Secret" },
    { key: "locked", type: "boolean", label: "Locked" },
    { key: "created", type: "boolean", label: "Whether it had to be created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const key = String(p.key ?? "").trim();
    if (!key) throw new Error("`key` is required");
    const value = String(p.value ?? "");
    if (!value) throw new Error("`value` is required");

    const body = { value, secret: p.secret === true, locked: p.locked === true };
    const client = new ChecklyClient(ctx);

    // Only the key is logged — the value is the whole point of the call.
    ctx.log("info", "setting a Checkly environment variable", { key, secret: body.secret });

    try {
      const updated = await client.request<Record<string, unknown>>(
        `/v1/variables/${encodeURIComponent(key)}`,
        { method: "PUT", body },
      );
      return { ...updated, created: false };
    } catch (err) {
      // A variable that does not exist yet is a 404 on the update; anything
      // else is a real failure and must not be swallowed.
      if (!String((err as Error).message).includes(" 404 ")) throw err;
      const created = await client.request<Record<string, unknown>>("/v1/variables", {
        method: "POST",
        body: { key, ...body },
      });
      return { ...created, created: true };
    }
  },
};

export default action;
