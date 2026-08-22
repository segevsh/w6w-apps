import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PlaidClient } from "../lib/client.ts";

/**
 * `POST /institutions/get` and `/institutions/search` — which banks are
 * supported.
 *
 * Useful for two things: showing a user what they can connect before sending
 * them into Link, and answering "why did this institution fail" — an
 * institution's `status` reports Plaid's own view of whether logins and
 * transaction updates are currently working for it, which is a much better
 * answer than a generic error.
 *
 * `oauth: true` marks institutions that redirect the user to their bank's own
 * site during Link. Those need a registered redirect URI, and they are the
 * usual reason a Link flow that works in sandbox fails in production.
 *
 * A search needs a query; without one this lists everything, paged.
 */
const action: ActionDefinition = {
  key: "institution-list",
  type: "search",
  resource: "institution",
  title: "List or search institutions",
  description:
    "Supported banks, with the status Plaid publishes for each — a far better answer to 'why " +
    "did this fail' than a generic error.",
  params: [
    {
      key: "query",
      label: "Search",
      type: "string",
      default: "",
      hint: "A name to search for. Empty lists institutions in order.",
    },
    {
      key: "countryCodes",
      label: "Country Codes",
      type: "string",
      default: "US",
      hint: "Comma-separated ISO codes. Required by Plaid.",
    },
    {
      key: "products",
      label: "Supporting Products",
      type: "string",
      default: "",
      hint: "Comma-separated. Narrows to institutions supporting all of them.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      default: 50,
      hint: "Plaid's maximum is 500.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      advanced: true,
      showIf: { "==": [{ var: "query" }, ""] },
    },
    {
      key: "includeStatus",
      label: "Include Status",
      type: "boolean",
      default: true,
      hint: "Plaid's own view of whether logins and updates are working for each institution.",
    },
  ],
  output: [
    { key: "institutions", type: "array", label: "Institutions" },
    { key: "total", type: "number", label: "Total (listing only)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const query = String(p.query ?? "").trim();
    const countryCodes = csv(p.countryCodes) ?? ["US"];
    const products = csv(p.products);
    const count = Math.min(500, Math.max(1, Number(p.count ?? 50)));
    const options = compact({ include_optional_metadata: true });

    const client = new PlaidClient(ctx);
    if (query) {
      const body = await client.request<{ institutions?: unknown[] }>(
        "/institutions/search",
        compact({
          query,
          country_codes: countryCodes,
          products,
          options: { ...options, include_auth_metadata: false },
        }),
      );
      return { institutions: body?.institutions ?? [] };
    }

    const body = await client.request<{ institutions?: unknown[]; total?: number }>(
      "/institutions/get",
      compact({
        count,
        offset: Math.max(0, Number(p.offset ?? 0)),
        country_codes: countryCodes,
        options: compact({
          products,
          include_optional_metadata: true,
        }),
      }),
    );
    return { institutions: body?.institutions ?? [], total: body?.total };
  },
};

export default action;
