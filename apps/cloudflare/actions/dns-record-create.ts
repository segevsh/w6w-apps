import type { ActionDefinition } from "@w6w/types";
import { cfFetch } from "../lib/client.ts";

/**
 * Create a DNS record in a zone.
 * `POST /zones/{zone_id}/dns_records` —
 * https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/create/
 *
 * Record types supported by Cloudflare: A, AAAA, CAA, CERT, CNAME, DNSKEY, DS,
 * HTTPS, LOC, MX, NAPTR, NS, OPENPGPKEY, PTR, SMIMEA, SRV, SSHFP, SVCB, TLSA,
 * TXT, URI. This action exposes the common subset; less common types (DNSSEC
 * material, SSHFP, etc.) need fields this generic form does not model and are
 * left out rather than guessed at.
 */
const action: ActionDefinition = {
  key: "dns-record-create",
  type: "perform",
  resource: "dns-record",
  title: "Create a DNS record",
  description: "Create a new DNS record in a zone",
  idempotent: false,
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
      required: true,
      default: "A",
      options: [
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
      required: true,
      default: "",
      hint: "DNS record name, e.g. www or www.example.com",
    },
    {
      key: "content",
      label: "Content",
      type: "string",
      required: true,
      default: "",
      hint: "Record value, e.g. an IP for A/AAAA, a hostname for CNAME/MX/NS, text for TXT",
    },
    {
      key: "ttl",
      label: "TTL",
      type: "number",
      default: 1,
      hint: "Time to live in seconds (60-86400), or 1 for automatic",
    },
    {
      key: "proxied",
      label: "Proxied",
      type: "boolean",
      default: false,
      hint: "Route traffic through Cloudflare (only valid for A, AAAA and CNAME records)",
    },
    {
      key: "priority",
      label: "Priority",
      type: "number",
      default: 0,
      showIf: { field: "type", equals: "MX" },
      hint: "Required for MX records; ignored for other types",
    },
    {
      key: "comment",
      label: "Comment",
      type: "string",
      default: "",
      hint: "Administrative note. Has no effect on DNS resolution.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const zoneId = String(p.zoneId ?? "").trim();
    const type = String(p.type ?? "").trim();
    const name = String(p.name ?? "").trim();
    const content = String(p.content ?? "").trim();

    if (!zoneId) throw new Error("`zoneId` is required");
    if (!type) throw new Error("`type` is required");
    if (!name) throw new Error("`name` is required");
    if (!content) throw new Error("`content` is required");

    const body: Record<string, unknown> = {
      type,
      name,
      content,
      ttl: Number(p.ttl ?? 1),
    };
    if (p.proxied === true) body.proxied = true;
    if (type === "MX") {
      const priority = Number(p.priority ?? 0);
      if (!priority) throw new Error("`priority` is required for MX records");
      body.priority = priority;
    }
    if (typeof p.comment === "string" && p.comment.trim()) body.comment = p.comment.trim();

    ctx.log("info", "creating Cloudflare DNS record", { zoneId, type, name });

    const { result } = await cfFetch(ctx, `/zones/${encodeURIComponent(zoneId)}/dns_records`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return result;
  },
};

export default action;
