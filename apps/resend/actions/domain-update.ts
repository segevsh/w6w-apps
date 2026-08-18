import type { ActionDefinition } from "@w6w/types";
import { compact, ResendClient } from "../lib/client.ts";

/**
 * `PATCH /domains/{domain_id}` — verified against Resend's OpenAPI document.
 * Its body carries only the tracking and TLS settings: a domain's name and
 * region are immutable, so they are not offered here.
 */
const action: ActionDefinition = {
  key: "domain-update",
  type: "perform",
  resource: "domain",
  title: "Update a domain",
  description: "Change a domain's open/click tracking or TLS enforcement.",
  idempotent: true,
  params: [
    { key: "domainId", label: "Domain ID", type: "string", required: true, default: "" },
    { key: "openTracking", label: "Open Tracking", type: "boolean", default: null },
    { key: "clickTracking", label: "Click Tracking", type: "boolean", default: null },
    {
      key: "tls",
      label: "TLS",
      type: "select",
      default: "",
      options: [
        { value: "opportunistic", label: "Opportunistic (fall back to plaintext)" },
        { value: "enforced", label: "Enforced (require TLS)" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Domain ID" },
    { key: "name", type: "string", label: "Domain" },
    { key: "open_tracking", type: "boolean", label: "Open tracking" },
    { key: "click_tracking", type: "boolean", label: "Click tracking" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domainId = String(p.domainId ?? "").trim();
    if (!domainId) throw new Error("`domainId` is required");

    const body = compact({
      // `false` is a real setting here, so booleans are passed through rather
      // than dropped as falsy.
      open_tracking: typeof p.openTracking === "boolean" ? p.openTracking : undefined,
      click_tracking: typeof p.clickTracking === "boolean" ? p.clickTracking : undefined,
      tls: p.tls,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one field");
    }

    ctx.log("info", "updating Resend domain", { domainId, fields: Object.keys(body) });

    return await new ResendClient(ctx).request(`/domains/${encodeURIComponent(domainId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default action;
