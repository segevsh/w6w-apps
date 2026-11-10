import campaignList from "../actions/campaign-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/**
 * `GET /1/emailmarketing/campaigns.json?filter=all&limit=100&page=N` through `campaign-list`.
 * The endpoint documents `limit` (default 10) and `page` but no order
 * (https://developers.vbout.com/scripts/openapi.json, `EmailMarketing/Campaigns`) and groups items
 * by state (`items.<State>.data[]`), so every page is read until one adds no new id (or is empty)
 * and the union is snapshot-diffed (additions only). More than 50 pages throws.
 */
export default snapshotTrigger({
  key: "new-campaign",
  title: "New Email Campaign",
  description:
    "The run gets each email campaign (draft, scheduled or sent) newly created in Vbout.",
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "from_email", type: "string", label: "From email" },
    { key: "creation_date", type: "string", label: "Creation date" },
  ],
  sample: {
    id: "889",
    subject: "Hop Hop, Happy Fridays have never been happier",
    from_email: "no-reply@example.com",
    creation_date: "11/04/2014 16:33",
  },
  rows: async (_params, ctx) => {
    const byId = new Map<string, unknown>();
    for (let page = 1; page <= MAX_PAGES + 1; page++) {
      if (page > MAX_PAGES) throw new Error(`vbout campaigns exceed ${MAX_PAGES} pages`);
      const out = await campaignList.execute(
        { filter: "all", limit: PAGE_SIZE, page } as never,
        ctx,
      ) as { campaigns?: { items?: unknown } };
      const before = byId.size;
      for (const item of flatten(out.campaigns?.items)) {
        byId.set(String((item as { id?: unknown }).id ?? ""), item);
      }
      if (byId.size === before) break;
    }
    return [...byId.values()];
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

/** `items` is `{ <State>: { data: [...] } }` (or a plain array): collect every record. */
function flatten(items: unknown): unknown[] {
  if (Array.isArray(items)) return items;
  if (!items || typeof items !== "object") return [];
  return Object.values(items).flatMap((bucket) => {
    const data = (bucket as { data?: unknown } | null)?.data;
    return Array.isArray(data) ? data : [];
  });
}
