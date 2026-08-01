import type { ActionDefinition } from "@w6w/types";
import { cfFetch } from "../lib/client.ts";

/**
 * List zones visible to this token.
 * `GET /zones` — https://developers.cloudflare.com/api/resources/zones/methods/list/
 */
const action: ActionDefinition = {
  key: "zone-list",
  type: "read",
  resource: "zone",
  title: "List zones",
  description: "List zones (domains) this token can see",
  params: [
    {
      key: "name",
      label: "Zone Name",
      type: "string",
      default: "",
      hint: "Filter by exact zone name, e.g. example.com",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "",
      hint: "Filter by zone status",
      options: [
        { value: "", label: "Any" },
        { value: "active", label: "Active" },
        { value: "pending", label: "Pending" },
        { value: "initializing", label: "Initializing" },
        { value: "moved", label: "Moved" },
      ],
    },
    {
      key: "perPage",
      label: "Per Page",
      type: "number",
      default: 20,
      hint: "Max number of zones to return (Cloudflare paginates at 50 by default)",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      hint: "Page number (1-indexed)",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const qs = new URLSearchParams();
    const name = String(p.name ?? "").trim();
    const status = String(p.status ?? "").trim();
    if (name) qs.set("name", name);
    if (status) qs.set("status", status);
    qs.set("per_page", String(Number(p.perPage ?? 20)));
    qs.set("page", String(Number(p.page ?? 1)));

    ctx.log("info", "listing Cloudflare zones", {
      name: name || undefined,
      status: status || undefined,
    });

    const { result } = await cfFetch(ctx, `/zones?${qs.toString()}`);
    return result;
  },
};

export default action;
