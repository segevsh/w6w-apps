/**
 * Shared poll logic for the OneDrive triggers.
 *
 * Two shapes live here, both built on the app's own actions (same client, same
 * endpoint, same auth as the action):
 *
 *  - **Delta classification** — `List Changes` (`GET …/root/delta`,
 *    https://learn.microsoft.com/en-us/graph/api/driveitem-delta, checked 2026-11-10), the request
 *    the existing File Changed trigger already makes. Children listings are no substitute: their
 *    `$orderby` documents only `name`/`size`/`lastModifiedDateTime` (and `name`/`url` on OneDrive
 *    for Business and SharePoint) and the reference lists no `$filter`
 *    (https://learn.microsoft.com/en-us/onedrive/developer/rest-api/concepts/optional-query-parameters).
 *    Delta reports each changed item's *latest state* once per round, not an event, so
 *    "created" vs "updated" vs "deleted" is decided here:
 *      deleted  → the item carries the `deleted` facet;
 *      created  → `createdDateTime` is at or after the window start;
 *      updated  → it is not deleted and was created before the window start.
 *    The window start is `max(floor, since − 60 s)`: `floor` is the instant the subscription was
 *    seeded (nothing older is ever "created", so the seed can never cause a flood later) and
 *    `since` is when the previous *complete* delta round began.
 *  - **Snapshot** — `pollSnapshot` over a small bounded list (permissions of one item, the user's
 *    drives), "added" only.
 */
import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listChanges from "../actions/list-changes.ts";
import listDrives from "../actions/list-drives.ts";
import listPermissions from "../actions/list-permissions.ts";
import { driveIdParam } from "./params.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export const DELTA_PAGE_MAX = 999;
/** Slack for clock skew between Graph and the host, applied only after the first round. */
export const CREATED_OVERLAP_MS = 60_000;
/** Ids remembered by a "created" trigger so an overlap never emits an item twice. */
export const SEEN_MAX = 500;
/** Page cap for the snapshot lists; more pages than this throws instead of guessing. */
const SNAPSHOT_MAX_PAGES = 10;

export interface DriveItem {
  id?: string;
  name?: string;
  size?: number;
  webUrl?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  file?: Record<string, unknown>;
  folder?: Record<string, unknown>;
  root?: Record<string, unknown>;
  deleted?: unknown;
  parentReference?: { id?: string; driveId?: string; [k: string]: unknown };
  [k: string]: unknown;
}

export interface DeltaParams {
  driveId?: string;
  folderId?: string;
}

export interface DeltaState {
  v: 1;
  kind: "token";
  seeded: true;
  token: string;
  floor: number;
  since: number;
  /** Start of the delta round still being drained; absent between rounds. */
  roundStart?: number;
  seen: string[];
}

type Change = "created" | "updated" | "deleted";
type Facet = "file" | "folder";

function readState(state: unknown): DeltaState | undefined {
  const s = state as Partial<DeltaState> | null;
  if (
    !s || typeof s !== "object" || s.v !== 1 || s.kind !== "token" || s.seeded !== true ||
    typeof s.token !== "string" || typeof s.floor !== "number" || typeof s.since !== "number" ||
    !Array.isArray(s.seen)
  ) return undefined;
  return s as DeltaState;
}

async function fetchDelta(driveId: string | undefined, token: string, ctx: HookContext) {
  const result = await listChanges.execute(
    token === "latest"
      ? { driveId, token, top: DELTA_PAGE_MAX, all: false }
      : { driveId, deltaLink: token, top: DELTA_PAGE_MAX, all: false },
    ctx,
  );
  const cursor = result.nextLink ?? result.deltaLink;
  if (!cursor) {
    throw new Error("OneDrive delta response did not contain a continuation or delta link.");
  }
  return {
    items: result.value as DriveItem[],
    cursor,
    /** True when this page ended the round (Graph sent a deltaLink, no nextLink). */
    complete: !result.nextLink,
  };
}

function classify(item: DriveItem, windowStart: number): Change | undefined {
  if (item.deleted) return "deleted";
  if (item.root) return undefined;
  const created = Date.parse(item.createdDateTime ?? "");
  // An item with no parseable creation stamp is kept as "created" (deduped by id).
  return Number.isNaN(created) || created >= windowStart ? "created" : "updated";
}

/** One check of a delta-classified trigger. */
export async function pollDelta(o: {
  params: DeltaParams;
  state: unknown;
  ctx: HookContext;
  change: Change;
  facet?: Facet;
}): Promise<{ events: DriveItem[]; nextState: DeltaState }> {
  const { params, ctx } = o;
  const now = clock.now();
  const seed = async (): Promise<DeltaState> => ({
    v: 1,
    kind: "token",
    seeded: true,
    token: (await fetchDelta(params.driveId, "latest", ctx)).cursor,
    floor: now,
    since: now,
    seen: [],
  });

  const prior = readState(o.state);
  if (!prior) return { events: [], nextState: await seed() };

  const roundStart = prior.roundStart ?? now;
  let page: Awaited<ReturnType<typeof fetchDelta>>;
  try {
    page = await fetchDelta(params.driveId, prior.token, ctx);
  } catch (err) {
    // Graph answers 410 Gone when a delta token has expired: start a fresh round, emit nothing.
    if (err instanceof Error && /Microsoft Graph 410\b/.test(err.message)) {
      return { events: [], nextState: await seed() };
    }
    throw err;
  }

  const windowStart = Math.max(prior.floor, prior.since - CREATED_OVERLAP_MS);
  const seen = new Set(prior.seen);
  const events: DriveItem[] = [];
  for (const item of page.items) {
    if (typeof item.id !== "string" || item.id === "") continue;
    if (params.folderId && item.parentReference?.id !== params.folderId) continue;
    if (o.facet && !item[o.facet]) continue;
    if (classify(item, windowStart) !== o.change) continue;
    if (o.change === "created") {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
    }
    events.push(item);
  }

  const nextState: DeltaState = {
    v: 1,
    kind: "token",
    seeded: true,
    token: page.cursor,
    floor: prior.floor,
    since: page.complete ? roundStart : prior.since,
    seen: [...seen].slice(-SEEN_MAX),
  };
  if (!page.complete) nextState.roundStart = roundStart;
  return { events, nextState };
}

export const folderIdParam: Param = {
  key: "folderId",
  label: "Folder ID",
  type: "string",
  advanced: true,
  hint:
    "Only fire for items directly inside this folder (its driveItem id, as List Children returns it). Leave empty for the whole drive.",
};

const itemOutputFields: OutputField[] = [
  { key: "id", type: "string", label: "Item ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "size", type: "number", label: "Size (bytes)" },
  { key: "webUrl", type: "string", label: "Web URL" },
  { key: "createdDateTime", type: "string", label: "Created at" },
  { key: "lastModifiedDateTime", type: "string", label: "Modified at" },
  { key: "parentReference", type: "object", label: "Parent reference" },
];

const sampleFile: DriveItem = {
  id: "01ABCDEF",
  name: "Report.docx",
  size: 20480,
  createdDateTime: "2026-11-10T09:00:00Z",
  lastModifiedDateTime: "2026-11-10T09:00:00Z",
  file: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  parentReference: { driveId: "b!sample-drive", id: "01PARENT" },
};

const sampleFolder: DriveItem = {
  id: "01FOLDER",
  name: "Invoices",
  size: 0,
  createdDateTime: "2026-11-10T09:00:00Z",
  lastModifiedDateTime: "2026-11-10T09:00:00Z",
  folder: { childCount: 0 },
  parentReference: { driveId: "b!sample-drive", id: "01PARENT" },
};

/** The four created/updated × file/folder triggers and the deleted one share this factory. */
export function deltaTrigger(
  spec: {
    key: string;
    title: string;
    description: string;
    change: Change;
    facet?: Facet;
    withFolder?: boolean;
  },
): TriggerDefinition<DeltaParams, DriveItem> {
  const sample = spec.change === "deleted"
    ? {
      id: "01ABCDEF",
      name: "Report.docx",
      deleted: { state: "deleted" },
      parentReference: { driveId: "b!sample-drive", id: "01PARENT" },
    }
    : spec.facet === "folder"
    ? sampleFolder
    : sampleFile;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: [driveIdParam, ...(spec.withFolder === false ? [] : [folderIdParam])],
    output: itemOutputFields,
    sample,
    minIntervalMs: 300_000,
    poll: ({ params, state }, ctx) =>
      pollDelta({ params, state, ctx, change: spec.change, facet: spec.facet }),
  };
}

// ----------------------------------------------------------------- snapshots --

function overCap(what: string): Error {
  return new Error(
    `OneDrive: more than ${SNAPSHOT_MAX_PAGES} pages of ${what}; refusing to track a partial list.`,
  );
}

export interface PermissionParams {
  driveId?: string;
  itemId: string;
}

export async function pollPermissions(o: {
  params: PermissionParams;
  state: unknown;
  ctx: HookContext;
}) {
  const r = await listPermissions.execute(
    { driveId: o.params.driveId, itemId: o.params.itemId, all: true, maxPages: SNAPSHOT_MAX_PAGES },
    o.ctx,
  );
  if (r.nextLink) throw overCap("permissions");
  const rows = r.value
    .filter((p) => typeof p.id === "string" && p.id !== "")
    .map((p) => ({ key: p.id as string, values: p }));
  const out = await pollSnapshot({
    state: o.state,
    rows,
    emit: { added: true, updated: false, removed: false },
  });
  return {
    events: out.events.map((e) => e.values as Record<string, unknown>),
    nextState: out.nextState,
  };
}

export async function pollDrives(o: { state: unknown; ctx: HookContext }) {
  const r = await listDrives.execute({ all: true, maxPages: SNAPSHOT_MAX_PAGES }, o.ctx);
  if (r.nextLink) throw overCap("drives");
  const rows = r.value
    .filter((d) => typeof d.id === "string" && d.id !== "")
    .map((d) => ({ key: d.id as string, values: d }));
  const out = await pollSnapshot({
    state: o.state,
    rows,
    emit: { added: true, updated: false, removed: false },
  });
  return {
    events: out.events.map((e) => e.values as Record<string, unknown>),
    nextState: out.nextState,
  };
}
