import type { ActionDefinition } from "@w6w/types";
import { netlifyFetch } from "../lib/client.ts";

/**
 * List sites this token can see.
 * `GET /sites` — https://open-api.netlify.com/ (operationId `listSites`)
 */
const action: ActionDefinition = {
  key: "site-list",
  type: "read",
  resource: "site",
  title: "List sites",
  description: "List sites this token can see",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Filter by site name",
    },
    {
      key: "filter",
      label: "Filter",
      type: "select",
      default: "",
      hint: "Restrict to sites you own or sites you're a guest on",
      options: [
        { value: "", label: "Any" },
        { value: "all", label: "All" },
        { value: "owner", label: "Owner" },
        { value: "guest", label: "Guest" },
      ],
    },
    {
      key: "perPage",
      label: "Per Page",
      type: "number",
      default: 20,
      hint: "Max number of sites to return",
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
    const filter = String(p.filter ?? "").trim();
    if (name) qs.set("name", name);
    if (filter) qs.set("filter", filter);
    qs.set("per_page", String(Number(p.perPage ?? 20)));
    qs.set("page", String(Number(p.page ?? 1)));

    ctx.log("info", "listing Netlify sites", {
      name: name || undefined,
      filter: filter || undefined,
    });

    return await netlifyFetch(ctx, `/sites?${qs.toString()}`);
  },
};

export default action;
