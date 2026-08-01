import type { ActionDefinition } from "@w6w/types";
import { compact, parseJsonParam, post } from "../lib/client.ts";

/**
 * `POST /v1/batch` — send up to 2,500 identify/track/page/group/alias calls
 * in one request. Verified 2026-08-01 via the docs' Netlify mirror: the
 * top-level shape is `{ batch: [...], context?, integrations? }` where each
 * `batch` item carries its own `type` field ("identify" | "track" | "page" |
 * "group" | "alias") plus that call's own fields; a top-level `context` /
 * `integrations` is merged into items that don't set their own.
 *
 * Documented limits (same source): 500 KB total per batch request, 2,500
 * events max, 32 KB max per individual event. This action checks the event
 * count client-side (cheap, and fails fast with a clear message); it does not
 * estimate payload byte size, since that would require re-serializing and
 * still only approximate what Segment itself measures.
 */
const action: ActionDefinition = {
  key: "batch",
  type: "perform",
  resource: "batch",
  title: "Batch",
  description: "Send up to 2,500 identify/track/page/group/alias calls in one request.",
  idempotent: false,
  params: [
    {
      key: "batch",
      label: "Batch",
      type: "json",
      required: true,
      hint: 'Array of call objects, each with its own "type" ("identify" | "track" | "page" | ' +
        '"group" | "alias") plus that call\'s fields, e.g. ' +
        '[{ "type": "track", "event": "Signed Up", "userId": "u1" }]. Max 2,500 items.',
    },
    {
      key: "context",
      label: "Context",
      type: "json",
      hint: "Applied to every batch item that doesn't set its own `context`.",
    },
    {
      key: "integrations",
      label: "Integrations",
      type: "json",
      hint: "Applied to every batch item that doesn't set its own `integrations`.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Accepted by Segment" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = typeof p.batch === "string" ? (p.batch.trim() ? JSON.parse(p.batch) : []) : p.batch;
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("`batch` must be a non-empty JSON array");
    }
    if (raw.length > 2500) {
      throw new Error(`\`batch\` carries ${raw.length} items; Segment accepts at most 2,500`);
    }
    for (const [i, item] of raw.entries()) {
      const o = item as Record<string, unknown>;
      if (!o || typeof o !== "object" || typeof o.type !== "string" || !o.type) {
        throw new Error(`batch item ${i} is missing a \`type\``);
      }
    }

    const body = compact({
      batch: raw,
      context: parseJsonParam(p.context),
      integrations: parseJsonParam(p.integrations),
    });

    ctx.log("info", "Segment batch", { count: raw.length });
    return await post(ctx, "/batch", body);
  },
};

export default action;
