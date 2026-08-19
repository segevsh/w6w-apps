import type { ActionDefinition } from "@w6w/types";
import { csv, TypesenseClient } from "../lib/client.ts";

/**
 * `POST /keys` — mint a key scoped to what it needs.
 *
 * ## The value comes back once
 *
 * Typesense returns the full key in the creation response and never again;
 * every later listing shows a prefix. Whatever receives this must store it at
 * that moment, or the key exists and is useless.
 *
 * It follows that the value must not be logged, and a test asserts it is not.
 *
 * ## Scoping is the point, and the defaults here are the careful ones
 *
 * A key names its **actions** and its **collections**. The useful shapes:
 *
 * - `documents:search` on one collection — safe to ship to a browser, which
 *   is Typesense's normal front-end pattern.
 * - `documents:*` on one collection — an indexer for that collection.
 * - `*` on `*` — an admin key, which can drop everything.
 *
 * This action defaults to search-only, because a key that turns out to be too
 * narrow fails loudly and immediately, while one that turns out to be too wide
 * fails silently for months.
 *
 * ## Expiry is seconds since the epoch, not a duration
 *
 * Sending a duration produces a key that expired in 1970 and a 401 that says
 * nothing about expiry, so this takes days and converts.
 */
const action: ActionDefinition = {
  key: "key-create",
  type: "perform",
  resource: "key",
  title: "Create an API key",
  description:
    "Mint a scoped key. The VALUE IS RETURNED ONCE and never again, so whatever receives it must " +
    "store it there and then. Defaults to search-only on the named collections — too narrow " +
    "fails immediately, too wide fails silently.",
  idempotent: false,
  params: [
    {
      key: "description",
      label: "Description",
      type: "string",
      required: true,
      default: "",
      hint: "The only label an audit of this node's keys will have.",
    },
    {
      key: "collections",
      label: "Collections",
      type: "string",
      default: "*",
      hint: "Comma-separated names, or `*` for all of them. Naming them is the difference " +
        "between a key for one index and a key for the node.",
    },
    {
      key: "actions",
      label: "Actions",
      type: "string",
      default: "documents:search",
      placeholder: "documents:search",
      hint: "Comma-separated. `documents:search` is safe in a browser; `documents:*` can write; " +
        "`*` can drop collections.",
    },
    {
      key: "expiresInDays",
      label: "Expires in (days)",
      type: "number",
      default: 0,
      hint: "0 means never. Typesense takes a Unix timestamp; this converts, because sending a " +
        "duration produces a key that expired in 1970 and a 401 that never mentions expiry.",
    },
  ],
  output: [
    { key: "value", type: "string", label: "The key — returned once, never again" },
    { key: "id", type: "number", label: "Its id, for revoking it later" },
    { key: "valuePrefix", type: "string", label: "What later listings will show" },
    { key: "actions", type: "array", label: "What it may do" },
    { key: "collections", type: "array", label: "Where it may do it" },
    { key: "expiresAt", type: "number", label: "Unix seconds, or unset" },
    { key: "isAdmin", type: "boolean", label: "True when it can do anything, anywhere" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const description = String(p.description ?? "").trim();
    if (!description) {
      throw new Error(
        "`description` is required — it is the only label anyone auditing this node's keys later " +
          "will have to go on",
      );
    }

    const actions = csv(p.actions) ?? ["documents:search"];
    const collections = csv(p.collections) ?? ["*"];
    const isAdmin = actions.includes("*") && collections.includes("*");
    if (isAdmin) {
      ctx.log(
        "warn",
        "this key can perform every action on every collection, including dropping them — that " +
          "is an administrative key, not one to ship anywhere",
        { description },
      );
    }

    const days = Number(p.expiresInDays ?? 0);
    if (!Number.isFinite(days) || days < 0) {
      throw new Error("`expiresInDays` must be 0 or more — 0 means the key never expires");
    }
    // Typesense wants an absolute timestamp; a duration lands in 1970.
    const expiresAt = days > 0
      ? Math.floor(Date.now() / 1000) + Math.trunc(days * 86_400)
      : undefined;

    const created = await new TypesenseClient(ctx).request<{
      id?: number;
      value?: string;
      value_prefix?: string;
      expires_at?: number;
    }>("/keys", {
      method: "POST",
      body: {
        description,
        actions,
        collections,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      },
    });

    // The id and the shape. Never the value — this is its only existence.
    ctx.log("info", "created a Typesense API key", { id: created?.id, actions, collections });

    return {
      value: created?.value,
      id: created?.id,
      valuePrefix: created?.value_prefix,
      actions,
      collections,
      expiresAt: created?.expires_at ?? expiresAt,
      isAdmin,
    };
  },
};

export default action;
