import type { HookContext, Param } from "@w6w/types";
import listEntries from "../actions/list-entries.ts";
import { collectPages } from "./triggers.ts";

/** Rows read per check; a window past it is cut with a warning, not stalled. */
export const WINDOW_ROWS = 4000;

export interface Entry {
  uid?: string;
  title?: string;
  locale?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface EntryParams {
  contentTypeUid?: string;
}

export const CONTENT_TYPE_PARAM: Param = {
  key: "contentTypeUid",
  label: "Content type UID",
  type: "string",
  required: true,
  hint: "The content type to watch, e.g. blog_post.",
};

/**
 * Every entry of one content type whose `field` (`created_at` or `updated_at`) is after `sinceMs`.
 * `GET /v3/content_types/{uid}/entries` takes the `query` parameter, a JSON filter in the
 * Content Delivery API Queries syntax (`$gt` on a field), and pages with `limit` (at most 100)
 * and `skip` (https://www.contentstack.com/docs/developers/apis/content-management-api , "Get all
 * Entries", verified 2026-11-10). No sort parameter is sent: the filter does the narrowing, and
 * `lib/since.ts` still drops anything older than the trigger's start and anything seen before, so a
 * server that ignored the filter could cost only the window cap, never a replay.
 */
export async function entryWindow(
  field: "created_at" | "updated_at",
  sinceMs: number,
  ctx: HookContext,
  params: EntryParams,
  key: string,
): Promise<Entry[]> {
  const contentTypeUid = String(params.contentTypeUid ?? "").trim();
  if (!contentTypeUid) throw new Error("Set Content type UID to the content type to watch.");
  const rows = await collectPages<Entry>(
    100,
    async (skip, limit) => {
      const out = await listEntries.execute({
        contentTypeUid,
        query: { [field]: { $gt: new Date(sinceMs).toISOString() } },
        limit,
        skip,
      }, ctx) as { entries?: Entry[] };
      return out.entries ?? [];
    },
    WINDOW_ROWS,
    true,
  );
  if (rows.length >= WINDOW_ROWS) {
    ctx.log(
      "warn",
      `${key}: window holds ${WINDOW_ROWS}+ entries; reading the first ${WINDOW_ROWS}`,
    );
  }
  return rows;
}

export const entryOutput = [
  { key: "uid", type: "string" as const, label: "Entry UID" },
  { key: "title", type: "string" as const, label: "Title" },
  { key: "locale", type: "string" as const, label: "Locale" },
  { key: "created_at", type: "string" as const, label: "Created at" },
  { key: "updated_at", type: "string" as const, label: "Updated at" },
];

export const entrySample = {
  uid: "blt0123456789abcdef",
  title: "Hello world",
  locale: "en-us",
  created_at: "2026-11-09T10:00:00.000Z",
  updated_at: "2026-11-09T10:00:00.000Z",
};

export const timeMs = (iso: string | undefined): number | undefined =>
  iso ? Date.parse(iso) : undefined;
