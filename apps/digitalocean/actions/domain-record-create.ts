import type { ActionDefinition } from "@w6w/types";
import { compact, DigitalOceanClient } from "../lib/client.ts";

/**
 * `POST /v2/domains/{domain}/records` — add a DNS record.
 *
 * ## The name is relative, and giving the full one creates a doubled record
 *
 * A record named `www` under `example.com` serves `www.example.com`. A record
 * named `www.example.com` under the same domain serves
 * **`www.example.com.example.com`**, and DigitalOcean accepts it without
 * complaint. The record exists, resolves to nothing, and looks like a
 * propagation problem for as long as somebody is prepared to wait.
 *
 * This action detects the doubled form and refuses it, because it is the single
 * most common DNS mistake and the API will not catch it.
 *
 * ## `CNAME` and `MX` data needs a trailing dot for the same reason
 *
 * Without it the target is read relative to the domain. This appends one rather
 * than letting the record be created wrong.
 *
 * ## The TTL is the length of the mistake, not a performance dial
 *
 * A record created at 86400 that turns out to be wrong keeps being served for
 * up to a day after it is fixed, by every resolver that cached it. Creating
 * records at a low TTL and raising it once they are proven is the safe order,
 * so this defaults to 300 rather than to DigitalOcean's 1800.
 */
const action: ActionDefinition = {
  key: "domain-record-create",
  type: "perform",
  resource: "dns-record",
  title: "Create a DNS record",
  description:
    "Add a DNS record. The name is RELATIVE — giving `www.example.com` under `example.com` " +
    "creates `www.example.com.example.com`, which the API accepts silently — so that form is " +
    "refused here. Defaults to a 300-second TTL, because a TTL is how long a mistake lasts.",
  idempotent: false,
  params: [
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      default: "",
      placeholder: "example.com",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "A",
      options: [
        { value: "A", label: "A" },
        { value: "AAAA", label: "AAAA" },
        { value: "CNAME", label: "CNAME" },
        { value: "TXT", label: "TXT" },
        { value: "MX", label: "MX" },
        { value: "NS", label: "NS" },
        { value: "SRV", label: "SRV" },
        { value: "CAA", label: "CAA" },
      ],
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "www",
      hint: "RELATIVE to the domain. `@` is the domain itself. Giving the fully-qualified form " +
        "creates a doubled record.",
    },
    {
      key: "data",
      label: "Data",
      type: "string",
      required: true,
      default: "",
      hint: "For CNAME and MX a trailing dot is added if missing, or the target is read relative " +
        "to the domain.",
    },
    {
      key: "ttl",
      label: "TTL (seconds)",
      type: "number",
      default: 300,
      hint: "How long a wrong record keeps being served after it is fixed. Start low, raise it " +
        "once the record is proven.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "number",
      default: 0,
      showIf: { "in": [{ var: "type" }, ["MX", "SRV"]] },
    },
  ],
  output: [
    { key: "record", type: "object", label: "The record as created" },
    { key: "id", type: "number", label: "Its id" },
    { key: "qualifiedName", type: "string", label: "What it actually serves" },
    { key: "data", type: "string", label: "The data as stored, dot included" },
    { key: "ttl", type: "number", label: "How long a mistake would last" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domain = String(p.domain ?? "").trim().replace(/\.$/, "");
    const type = String(p.type ?? "A").trim();
    const name = String(p.name ?? "").trim();
    let data = String(p.data ?? "").trim();
    if (!domain) throw new Error("`domain` is required");
    if (!name) throw new Error("`name` is required — use `@` for the domain itself");
    if (!data) throw new Error("`data` is required");

    // The commonest DNS mistake, and the API accepts it silently.
    if (name !== "@" && (name === domain || name.endsWith(`.${domain}`))) {
      const relative = name === domain ? "@" : name.slice(0, -(domain.length + 1));
      throw new Error(
        `\`name\` is relative to the domain, so "${name}" under "${domain}" would create ` +
          `"${name}.${domain}" — which resolves to nothing and looks like a propagation delay. ` +
          `Use "${relative}" instead`,
      );
    }

    // Without the dot the target is read relative to the domain.
    if ((type === "CNAME" || type === "MX" || type === "NS") && !data.endsWith(".")) {
      data = `${data}.`;
    }

    const ttl = Math.max(30, Number(p.ttl ?? 300));
    const body = compact({
      type,
      name,
      data,
      ttl,
      priority: type === "MX" || type === "SRV" ? Number(p.priority ?? 0) || undefined : undefined,
    });

    const result = await new DigitalOceanClient(ctx).request<{
      domain_record?: { id?: number; name?: string; data?: string; ttl?: number };
    }>(`/v2/domains/${encodeURIComponent(domain)}/records`, { method: "POST", body });

    const record = result?.domain_record;
    const qualifiedName = record?.name === "@" ? domain : `${record?.name}.${domain}`;

    // The name and the type. Not the data — a TXT record carries verification
    // tokens and other things that are secrets in practice.
    ctx.log("info", "created a DigitalOcean DNS record", { type, qualifiedName, ttl });

    return {
      record,
      id: record?.id,
      qualifiedName,
      data: record?.data,
      ttl: record?.ttl,
    };
  },
};

export default action;
