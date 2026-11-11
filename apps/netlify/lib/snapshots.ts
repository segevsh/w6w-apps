import type { SnapshotChange } from "../../_shared/poll/mod.ts";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { HookContext } from "@w6w/types";
import siteList from "../actions/site-list.ts";
import formList from "../actions/form-list.ts";

/** Netlify pages at most 100 items per request (https://docs.netlify.com/api/get-started/#pagination). */
const PAGE = 100;
/** Account-wide site list cap: 10 pages x 100 = 1000 sites, then the check fails loudly. */
const MAX_SITE_PAGES = 10;

function idKey(item: unknown): string {
  const id = (item as { id?: unknown } | null)?.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : "";
}

/** Every site the token can see (bounded), as snapshot rows keyed by site id. */
export async function pollSites(state: unknown, ctx: HookContext) {
  const rows: Array<{ key: string; values: unknown }> = [];
  for (let page = 1; page <= MAX_SITE_PAGES; page++) {
    const result = await siteList.execute({ perPage: PAGE, page }, ctx);
    const items = Array.isArray(result) ? result : [];
    for (const item of items) rows.push({ key: idKey(item), values: item });
    if (items.length < PAGE) break;
    if (page === MAX_SITE_PAGES) {
      throw new Error(
        `Netlify site list is over ${
          MAX_SITE_PAGES * PAGE
        } sites; new-site only snapshots that many.`,
      );
    }
  }
  return await pollSnapshot({ state, rows, emit: { added: true, updated: false } });
}

/** All forms of one site (the endpoint is not paginated), as snapshot rows keyed by form id. */
export async function pollForms(
  state: unknown,
  siteId: string,
  ctx: HookContext,
): Promise<{ events: SnapshotChange[]; nextState: unknown }> {
  const result = await formList.execute({ siteId }, ctx);
  const items = Array.isArray(result) ? result : [];
  return await pollSnapshot({
    state,
    rows: items.map((item) => ({ key: idKey(item), values: item })),
    emit: { added: true, updated: false },
  });
}
