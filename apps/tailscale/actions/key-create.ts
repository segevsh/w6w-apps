import type { ActionDefinition } from "@w6w/types";
import { assertTags, csv, tailnetFrom, TailscaleClient } from "../lib/client.ts";

/**
 * `POST /api/v2/tailnet/{tailnet}/keys` — mint an auth key so a machine can
 * join.
 *
 * ## The secret comes back exactly once
 *
 * Tailscale's spec: "The full key can no longer be retrieved after the initial
 * response." This action returns it, and that return value is the only copy
 * there will ever be. If a workflow does not store it somewhere at that moment,
 * the key exists, counts against nothing, and is useless — and the only fix is
 * to make another and delete this one.
 *
 * It follows that the key must not be logged, and a test asserts it is not.
 *
 * ## The four capabilities are the whole security decision
 *
 * - **`reusable`** — one machine, or any number. A reusable key left in a
 *   configuration management repository admits machines indefinitely.
 * - **`ephemeral`** — devices remove themselves when they go offline. This is
 *   what CI runners and short-lived containers should use; without it every
 *   build leaves a dead device behind forever.
 * - **`preauthorized`** — the device skips device approval. Convenient, and it
 *   is precisely the control that approval exists to provide.
 * - **`tags`** — the identity the joining device gets, and therefore what ACL
 *   rules apply to it. A key with no tags creates devices owned by the *user
 *   who made the key*, which is rarely what an automation wants.
 *
 * This action defaults to the careful end — single-use, ephemeral, not
 * preauthorized — because the convenient end is easy to ask for and hard to
 * notice afterwards.
 *
 * ## Expiry is capped at 90 days
 *
 * `expirySeconds` maxes out at 7,776,000. There is no non-expiring auth key.
 */
const action: ActionDefinition = {
  key: "key-create",
  type: "perform",
  resource: "key",
  title: "Create an auth key",
  description:
    "Mint a machine auth key. The secret is RETURNED ONCE and can never be retrieved again, so " +
    "whatever receives it must store it there and then. Defaults to single-use, ephemeral and " +
    "not preauthorized — the careful end of each choice.",
  idempotent: false,
  params: [
    {
      key: "description",
      label: "Description",
      type: "string",
      required: true,
      default: "",
      placeholder: "ci-runner",
      hint: "Up to 50 characters. This is the only label anyone reviewing keys later will have.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      placeholder: "tag:ci",
      hint: "The identity devices joining with this key receive. WITHOUT tags they are owned by " +
        "the user who created the key, and ACL rules written for the automation will not apply.",
    },
    {
      key: "reusable",
      label: "Reusable",
      type: "boolean",
      default: false,
      hint: "Off means one machine, ever. On means anything holding the key can keep joining.",
    },
    {
      key: "ephemeral",
      label: "Ephemeral",
      type: "boolean",
      default: true,
      hint: "Devices created with it remove themselves when they go offline — the right setting " +
        "for CI runners and containers, which otherwise pile up as dead devices.",
    },
    {
      key: "preauthorized",
      label: "Preauthorized",
      type: "boolean",
      default: false,
      hint: "On, devices skip device approval entirely — which is the control approval exists " +
        "to provide.",
    },
    {
      key: "expiryDays",
      label: "Expires in (days)",
      type: "number",
      default: 30,
      hint: "1 to 90. Tailscale has no non-expiring auth key.",
    },
  ],
  output: [
    { key: "authKey", type: "string", label: "The secret — returned once, never again" },
    { key: "id", type: "string", label: "The key's id, for revoking it later" },
    { key: "expires", type: "string", label: "When it stops working" },
    { key: "reusable", type: "boolean", label: "Whether more than one machine may use it" },
    { key: "ephemeral", type: "boolean", label: "Whether its devices clean themselves up" },
    { key: "preauthorized", type: "boolean", label: "Whether its devices skip approval" },
    { key: "tags", type: "array", label: "The identity its devices receive" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tailnet = tailnetFrom(ctx.connection);

    const description = String(p.description ?? "").trim();
    if (!description) {
      throw new Error(
        "`description` is required — it is the only label anyone auditing this tailnet's keys " +
          "later will have to go on",
      );
    }
    if (description.length > 50) {
      throw new Error(`\`description\` may be at most 50 characters — got ${description.length}`);
    }

    const tags = csv(p.tags) ?? [];
    if (tags.length) assertTags(tags, "tags");

    const expiryDays = Number(p.expiryDays ?? 30);
    if (!Number.isFinite(expiryDays) || expiryDays < 1 || expiryDays > 90) {
      throw new Error(
        `\`expiryDays\` must be between 1 and 90 — got ${expiryDays}. Tailscale caps auth key ` +
          "expiry at 90 days and has no non-expiring auth key",
      );
    }

    const reusable = p.reusable === true;
    const preauthorized = p.preauthorized === true;
    if (reusable && preauthorized) {
      ctx.log(
        "warn",
        "this key is both reusable and preauthorized — anything holding it can add machines to " +
          "the tailnet without device approval, for as long as the key lives",
        { description },
      );
    }
    if (!tags.length) {
      ctx.log(
        "info",
        "this key has no tags, so devices joining with it are owned by the user who created it " +
          "rather than by an automation identity — ACL rules written against a tag will not apply",
        { description },
      );
    }

    const created = await new TailscaleClient(ctx).request<{
      key?: string;
      id?: string;
      expires?: string;
    }>(`/tailnet/${encodeURIComponent(tailnet)}/keys`, {
      method: "POST",
      body: {
        keyType: "auth",
        description,
        expirySeconds: Math.trunc(expiryDays * 86_400),
        capabilities: {
          devices: {
            create: {
              reusable,
              ephemeral: p.ephemeral !== false,
              preauthorized,
              ...(tags.length ? { tags } : {}),
            },
          },
        },
      },
    });

    // The id and the shape. Never the key — this is its only existence.
    ctx.log("info", "created a Tailscale auth key", { id: created?.id, reusable, preauthorized });

    return {
      authKey: created?.key,
      id: created?.id,
      expires: created?.expires,
      reusable,
      ephemeral: p.ephemeral !== false,
      preauthorized,
      tags,
    };
  },
};

export default action;
