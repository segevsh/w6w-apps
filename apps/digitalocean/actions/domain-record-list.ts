import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, query } from "../lib/client.ts";

/**
 * `GET /v2/domains/{domain}/records` — DNS records.
 *
 * ## `@` is the domain itself, and DigitalOcean stores it that way
 *
 * A record's `name` is relative to the domain, and the domain itself is `@`
 * rather than the empty string or the full name. So a record for
 * `example.com` has `name: "@"` and one for `www.example.com` has
 * `name: "www"` — never the fully-qualified form. A workflow searching for
 * `www.example.com` in the name field finds nothing.
 *
 * This returns the fully-qualified name alongside, because that is what a
 * caller almost always means.
 *
 * ## The TTL is how long a mistake lasts
 *
 * It is not a performance setting so much as the length of the window in which
 * a wrong record keeps being served after it is fixed. A record at 86400 that
 * points somewhere wrong is wrong for a day, everywhere that cached it.
 *
 * ## `CNAME` and `MX` data must end with a dot
 *
 * DigitalOcean stores what it is given. A CNAME whose data omits the trailing
 * dot is interpreted relative to the domain, so `example.com` becomes
 * `example.com.example.com` — which resolves to nothing and looks like a
 * propagation delay.
 */
const action: ActionDefinition = {
  key: "domain-record-list",
  type: "search",
  resource: "dns-record",
  title: "List DNS records",
  description:
    "A domain's DNS records. The name is RELATIVE — the domain itself is `@`, never the " +
    "fully-qualified form — so this returns the qualified name alongside, which is what a " +
    "caller usually means.",
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
      label: "Record Type",
      type: "string",
      default: "",
      placeholder: "A",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Fully qualified, e.g. `www.example.com` — the API wants this form for the filter " +
        "even though it stores the relative one.",
    },
    { key: "perPage", label: "Page Size", type: "number", default: 100 },
  ],
  output: [
    { key: "records", type: "array", label: "The records, with a qualified name added" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "total", type: "number", label: "How many exist" },
    { key: "types", type: "array", label: "The distinct record types" },
    { key: "longestTtl", type: "number", label: "How long the worst mistake would last" },
    { key: "suspiciousCnames", type: "array", label: "CNAME data missing its trailing dot" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const domain = String(p.domain ?? "").trim().replace(/\.$/, "");
    if (!domain) throw new Error("`domain` is required");

    const page = await new DigitalOceanClient(ctx).list<{
      id?: number;
      type?: string;
      name?: string;
      data?: string;
      ttl?: number;
    }>(`/v2/domains/${encodeURIComponent(domain)}/records`, "domain_records", {
      query: query({
        type: p.type,
        name: p.name,
        per_page: Math.min(200, Math.max(1, Number(p.perPage ?? 100))),
      }),
    });

    const records = page.items.map((record) => ({
      ...record,
      // `@` means the domain itself; everything else is a label under it.
      qualifiedName: record?.name === "@" ? domain : `${record?.name}.${domain}`,
    }));

    // A CNAME without the trailing dot is read relative to the domain.
    const suspiciousCnames = records
      .filter((record) =>
        (record?.type === "CNAME" || record?.type === "MX") &&
        typeof record?.data === "string" &&
        record.data.includes(".") &&
        !record.data.endsWith(".")
      )
      .map((record) => `${record.qualifiedName} → ${record.data}`);

    if (suspiciousCnames.length) {
      ctx.log(
        "warn",
        "some CNAME or MX records have data without a trailing dot, which DigitalOcean reads as " +
          "relative to the domain — `example.com` becomes `example.com.example.com`",
        { count: suspiciousCnames.length },
      );
    }

    return {
      records,
      count: records.length,
      total: page.total,
      types: [...new Set(records.map((record) => record?.type).filter(Boolean) as string[])].sort(),
      // Not a performance setting — the length of the window a mistake lasts.
      longestTtl: records.reduce((max, record) => Math.max(max, Number(record?.ttl ?? 0)), 0),
      suspiciousCnames,
    };
  },
};

export default action;
