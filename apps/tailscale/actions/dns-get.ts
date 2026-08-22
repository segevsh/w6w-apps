import type { ActionDefinition } from "@w6w/types";
import { tailnetFrom, TailscaleClient } from "../lib/client.ts";

/**
 * The tailnet's DNS, which lives across four endpoints and only makes sense
 * read together.
 *
 * `GET /dns/nameservers`, `/dns/preferences`, `/dns/searchpaths` and
 * `/dns/split-dns` — four calls, because Tailscale splits settings that are
 * one setting in practice.
 *
 * ## MagicDNS depends on there being a nameserver, and turns itself off
 *
 * Tailscale's own words: "If all nameservers have been removed, MagicDNS will
 * be automatically disabled (until explicitly turned back on by the user)."
 *
 * That coupling is the reason to read these together. Removing the last global
 * nameserver silently switches off MagicDNS, and putting a nameserver back does
 * **not** switch it on again — somebody has to. Between those two moments,
 * every `machine.tailnet.ts.net` name in the tailnet stops resolving, and
 * nothing in the DNS settings says why.
 *
 * ## Split DNS is where an internal domain quietly stops working
 *
 * A map from domain to nameservers: `corp.example.com` resolved by the office
 * resolver, everything else by the global one. It is also the setting most
 * likely to be wrong after a migration, because the nameserver it names may be
 * reachable only through a subnet route that is no longer enabled — which
 * presents as DNS being broken rather than as routing being broken.
 *
 * This action reports which split-DNS resolvers are private addresses, since
 * those are exactly the ones that depend on a route.
 */
const action: ActionDefinition = {
  key: "dns-get",
  type: "read",
  resource: "dns",
  title: "Get DNS settings",
  description:
    "Nameservers, MagicDNS, search paths and split DNS in one read — four endpoints that are one " +
    "setting in practice. Removing the last nameserver turns MagicDNS OFF and adding one back " +
    "does not turn it on, so the pair has to be looked at together.",
  params: [],
  output: [
    { key: "nameservers", type: "array", label: "Global resolvers for the tailnet" },
    { key: "magicDNS", type: "boolean", label: "Whether machine names resolve" },
    { key: "searchPaths", type: "array", label: "Search domains" },
    { key: "splitDNS", type: "object", label: "Per-domain resolvers" },
    { key: "splitDNSDomains", type: "array", label: "Just the domains" },
    { key: "privateResolvers", type: "array", label: "Split-DNS resolvers on private addresses" },
    { key: "magicDNSAtRisk", type: "boolean", label: "MagicDNS is on with no global nameserver" },
  ],

  async execute(_input, ctx) {
    const tailnet = tailnetFrom(ctx.connection);
    const client = new TailscaleClient(ctx);
    const base = `/tailnet/${encodeURIComponent(tailnet)}/dns`;

    const nameservers = await client.request<{ dns?: string[] }>(`${base}/nameservers`);
    const preferences = await client.request<{ magicDNS?: boolean }>(`${base}/preferences`);
    const searchPaths = await client.request<{ searchPaths?: string[] }>(`${base}/searchpaths`);
    const splitDNS = await client.request<Record<string, string[]>>(`${base}/split-dns`);

    const servers = nameservers?.dns ?? [];
    const magicDNS = preferences?.magicDNS === true;

    // A private resolver is only reachable through a subnet route, and a
    // withdrawn route looks exactly like DNS being broken.
    const privateResolvers: Array<{ domain: string; resolver: string }> = [];
    for (const [domain, resolvers] of Object.entries(splitDNS ?? {})) {
      for (const resolver of resolvers ?? []) {
        if (isPrivate(resolver)) privateResolvers.push({ domain, resolver });
      }
    }

    if (magicDNS && !servers.length) {
      ctx.log(
        "warn",
        "MagicDNS is on with no global nameserver — removing the last one switches MagicDNS off " +
          "automatically, and adding one back does not switch it on again",
        {},
      );
    }

    return {
      nameservers: servers,
      magicDNS,
      searchPaths: searchPaths?.searchPaths ?? [],
      splitDNS: splitDNS ?? {},
      splitDNSDomains: Object.keys(splitDNS ?? {}),
      privateResolvers,
      magicDNSAtRisk: magicDNS && servers.length === 0,
    };
  },
};

/** RFC 1918 and friends — an address only reachable over a subnet route. */
function isPrivate(address: string): boolean {
  return /^10\./.test(address) ||
    /^192\.168\./.test(address) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(address) ||
    /^127\./.test(address) ||
    /^fd[0-9a-f]{2}:/i.test(address);
}

export default action;
