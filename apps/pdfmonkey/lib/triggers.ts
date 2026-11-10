import { pollNewItems } from "../../_shared/poll/mod.ts";
import type { HookContext, TriggerDefinition } from "@w6w/types";
import listDocuments from "../actions/list-documents.ts";

/** Seconds re-listed before the last check, so a document updated mid-check is never missed. */
export const OVERLAP_SECONDS = 120;
/** One page is 24 cards (PDFMonkey docs); five pages bound a check at 120 documents. */
export const MAX_PAGES = 5;
export const MAX_EVENTS = 120;
export const SEEN_WINDOW = 300;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface DocumentCard {
  id?: string;
  status?: string;
  filename?: string | null;
  download_url?: string | null;
  created_at?: string;
  updated_at?: string;
  document_template_id?: string;
}

const output = [
  { key: "id", type: "string" as const, label: "Document ID" },
  {
    key: "status",
    type: "string" as const,
    label: "draft, pending, generating, success or failure",
  },
  { key: "filename", type: "string" as const, label: "File name" },
  { key: "download_url", type: "string" as const, label: "Download URL (once generated)" },
  { key: "document_template_id", type: "string" as const, label: "Template ID" },
  { key: "created_at", type: "string" as const, label: "Created at" },
  { key: "updated_at", type: "string" as const, label: "Updated at" },
];

const sample = {
  id: "a5e86d72-f5b7-4b0e-9f4e-6f2b1b5b3c11",
  status: "success",
  filename: "invoice-1042.pdf",
  download_url: null,
  document_template_id: "c2f0a4d2-1b0e-4d5e-8a55-3a6a1f4a9e10",
  created_at: "2026-11-09T10:00:00.000Z",
  updated_at: "2026-11-09T10:00:05.000Z",
};

/** A card with no parseable `created_at` is kept: its age cannot be told. */
function createdRecently(c: DocumentCard, cursor: number): boolean {
  const created = Date.parse(c.created_at ?? "");
  return Number.isNaN(created) || created / 1000 >= cursor - OVERLAP_SECONDS;
}

/**
 * One check: list documents updated since `cursor − OVERLAP_SECONDS` (the SAME `list-documents`
 * request, `q[updated_since]`), dedupe by `idOf`
 * (`onlyCreatedSince` also drops cards created before that window). The first check only records the cursor and ids.
 */
async function check(
  state: unknown,
  ctx: HookContext,
  idOf: (c: DocumentCard) => string,
  onlyCreatedSince = false,
) {
  const checkedAt = Math.floor(clock.now() / 1000);
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const { events, nextState } = await pollNewItems<DocumentCard>({
    state,
    maxPages: MAX_PAGES,
    maxEvents: MAX_EVENTS,
    seenWindow: SEEN_WINDOW,
    idOf,
    async fetchPage(pageToken) {
      const page = pageToken ? Number(pageToken) : 1;
      const res = await listDocuments.execute({
        page,
        updatedSince: String(cursor - OVERLAP_SECONDS),
      }, ctx) as {
        document_cards?: DocumentCard[];
        meta?: { current_page?: number; total_pages?: number };
      };
      const more = (res.meta?.current_page ?? page) < (res.meta?.total_pages ?? 0);
      return {
        items: (res.document_cards ?? []).filter((c) =>
          !onlyCreatedSince || createdRecently(c, cursor)
        ),
        nextPageToken: more ? String(page + 1) : undefined,
      };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } };
}

export const newDocumentTrigger: TriggerDefinition = {
  key: "new-document",
  title: "New Document",
  description:
    "The run gets each document PDFMonkey newly lists as created (older documents that are merely edited are ignored).",
  minIntervalMs: 300_000,
  output,
  sample,
  poll: ({ state }, ctx) => check(state, ctx, (c) => String(c.id ?? ""), true),
};

export const newOrUpdatedDocumentTrigger: TriggerDefinition = {
  key: "new-or-updated-document",
  title: "New or Updated Document",
  description: "The run gets each document created or changed (for example finished generating).",
  minIntervalMs: 300_000,
  output,
  sample,
  poll: ({ state }, ctx) =>
    check(state, ctx, (c) => `${String(c.id ?? "")}:${String(c.updated_at ?? "")}`),
};
