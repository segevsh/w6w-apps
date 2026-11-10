import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { TriggerDefinition } from "@w6w/types";
import keyList from "../actions/key-value-store-keys-list.ts";

/** Newest-first page request shared by the Apify list triggers (`desc=1` sorts by creation time). */
export const NEWEST_FIRST = { desc: true, limit: 100, offset: 0 } as const;

/** `items` of an Apify list-page result. */
export const itemsOf = (result: unknown): unknown[] => {
  const items = (result as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? items : [];
};

/** The `id` of a raw Apify record, as a string. */
export const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

/** Keys requested per page of the key listing (the vendor default and maximum is 1000). */
const KEY_PAGE = 1000;
/** Pages of keys one check may read; a longer store throws instead of diffing a partial list. */
const KEY_PAGES = 5;

/**
 * "New record key in a key-value store": the keys endpoint pages by key in UTF-8 binary order
 * (`exclusiveStartKey` / `isTruncated`), not by time, so the whole key list is read and
 * snapshot-diffed (additions only; more than 5000 keys throws naming the cap).
 */
export const newStoreKey: TriggerDefinition = {
  key: "new-store-key",
  title: "New Key-Value Store Record",
  description: "The run gets each record key newly added to a key-value store.",
  params: [
    {
      key: "storeId",
      label: "Key-value store ID",
      type: "string",
      required: true,
      hint: "The key-value store to watch (an ID, or `username~store-name`).",
    },
    {
      key: "prefix",
      label: "Key prefix",
      type: "string",
      hint: "Only keys starting with this string.",
    },
  ],
  output: [
    { key: "key", type: "string", label: "Record key" },
    { key: "size", type: "number", label: "Record size in bytes" },
  ],
  sample: { key: "OUTPUT", size: 1024 },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const p = (params ?? {}) as { storeId?: unknown; prefix?: unknown };
    const rows: Array<{ key: string; values: unknown }> = [];
    let start: string | undefined;
    for (let n = 0;; n++) {
      if (n >= KEY_PAGES) {
        throw new Error(`apify key-value store has more than ${KEY_PAGES * KEY_PAGE} keys`);
      }
      const page = await keyList.execute({
        storeId: String(p.storeId ?? ""),
        prefix: p.prefix ? String(p.prefix) : undefined,
        exclusiveStartKey: start,
        limit: KEY_PAGE,
      }, ctx) as {
        items?: Array<{ key?: string }>;
        isTruncated?: boolean;
        nextExclusiveStartKey?: string;
      };
      for (const item of page.items ?? []) rows.push({ key: String(item.key ?? ""), values: item });
      if (!page.isTruncated || !page.nextExclusiveStartKey) break;
      start = page.nextExclusiveStartKey;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: 5000,
    });
    return { events: events.map((e) => e.values), nextState };
  },
};
