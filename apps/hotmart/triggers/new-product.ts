import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import productList from "../actions/product-list.ts";

/** The kit's snapshot cap; a walk that reaches it fails loudly instead of missing products. */
const MAX_ROWS = 5000;
const PAGE_SIZE = 100;
/** 5000 rows / 100 per page, plus one page to prove the cap was crossed. */
const MAX_PAGES = 51;

/**
 * Shape (c): the creator's own product catalog is walked page by page (`max_results`, `page_token`
 * from `page_info.next_page_token`) and diffed with `pollSnapshot`. Hotmart documents no sort order
 * for this endpoint, so nothing here depends on one.
 */
export default {
  key: "new-product",
  title: "New Product",
  description: "The run gets each new product.",
  output: [{ key: "id", type: "number", label: "Product ID" }],
  sample: { id: 1234567, name: "Course" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx: HookContext) {
    const rows: Array<{ key: string; values: unknown }> = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await productList.execute({ maxResults: PAGE_SIZE, pageToken }, ctx) as {
        items?: Array<{ id?: unknown }>;
        page_info?: { next_page_token?: string | null };
      };
      for (const p of res.items ?? []) rows.push({ key: String(p.id ?? ""), values: p });
      pageToken = res.page_info?.next_page_token ?? undefined;
      if (!pageToken) break;
    }
    if (pageToken) {
      throw new Error(
        `new-product: more than ${MAX_ROWS} products; the snapshot trigger cannot cover it`,
      );
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true },
      maxRows: MAX_ROWS,
    });
    return { events: events.map((e) => e.values), nextState };
  },
} satisfies TriggerDefinition;
