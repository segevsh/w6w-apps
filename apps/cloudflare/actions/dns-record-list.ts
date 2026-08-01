import type { ActionDefinition } from "@w6w/types";
import { cfFetch } from "../lib/client.ts";

/**
 * List DNS records for a zone, optionally filtered by type and/or name.
 * `GET /zones/{zone_id}/dns_records` —
 * https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/list/
 */
const action: ActionDefinition = {
  key: "dns-record-list",
  type: "read",
  resource: "dns-record",
  title: "List DNS records",
  description: "List a zone's DNS records, optionally filtered by type and/or name",
  params: [
    {
      key: "zoneId",
      label: "Zone ID",
      type: "string",
      required: true,
      default: "",
      hint: "The zone's ID",
    },
    {
      key: "type",
      label: "Record Type",
      type: "select",
      default: "",
      hint: "Filter by record type",
      options: [
        { value: "", label: "Any" },
        { value: "A", label: "A" },
        { value: "AAAA", label: "AAAA" },
        { value: "CNAME", label: "CNAME" },
        { value: "MX", label: "MX" },
        { value: "NS", label: "NS" },
        { value: "TXT", label: "TXT" },
        { value: "SRV", label: "SRV" },
        { value: "CAA", label: "CAA" },
        { value: "PTR", label: "PTR" },
      ],
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Filter by exact record name, e.g. www.example.com",
    },
    {
      key: "perPage",
      label: "Per Page",
      type: "number",
      default: 100,
      hint: "Max number of records to return",
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
    const zoneId = String(p.zoneId ?? "").trim();
    if (!zoneId) throw new Error("`zoneId` is required");

    const qs = new URLSearchParams();
    const type = String(p.type ?? "").trim();
    const name = String(p.name ?? "").trim();
    if (type) qs.set("type", type);
    if (name) qs.set("name", name);
    qs.set("per_page", String(Number(p.perPage ?? 100)));
    qs.set("page", String(Number(p.page ?? 1)));

    ctx.log("info", "listing Cloudflare DNS records", { zoneId, type: type || undefined });

    const { result } = await cfFetch(
      ctx,
      `/zones/${encodeURIComponent(zoneId)}/dns_records?${qs.toString()}`,
    );
    return result;
  },
};

export default action;
