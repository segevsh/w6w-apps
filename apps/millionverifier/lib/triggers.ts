import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollWindow } from "./window.ts";
import bulkListFiles from "../actions/bulk-list-files.ts";

const OVERLAP_MS = 120_000;
const PAGE = 50;
/** Pages one check reads; a bigger window resumes next check. */
const MAX_PAGES = 3;
export const clock = { now: (): number => Date.now() };

interface FileRecord {
  fileId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** The vendor's documented filter format, `yyyy-MM-dd HH:mm:ss`. Sent in UTC. */
export function stamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

/** The vendor's stamps are `yyyy-MM-dd HH:mm:ss` in UTC (the same form the filters take). */
const parseStamp = (value: unknown): number | undefined => {
  const ms = Date.parse(String(value ?? "").replace(" ", "T") + "Z");
  return Number.isNaN(ms) ? undefined : ms;
};

/**
 * Offset feed with an upper bound: continuation pages add `...To = window start`, so files that
 * arrive while the window drains cannot shift an offset (the next window reads them). One check
 * reads at most MAX_PAGES pages; the rest resumes next check (brief 9.8).
 */
function check(
  filter: "createdFrom" | "updatedAtFrom",
  idOf: (file: FileRecord) => string,
  state: unknown,
  ctx: HookContext,
) {
  const upper = filter === "createdFrom" ? "createdTo" : "updatedAtTo";
  const stampKey = filter === "createdFrom" ? "createdAt" : "updatedAt";
  return pollWindow<FileRecord, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE,
    seenWindow: 1000,
    idOf,
    tsOf: (file) => parseStamp(file[stampKey]),
    async load(since, offset, until) {
      const result = await bulkListFiles.execute(
        {
          offset: offset ?? 0,
          limit: PAGE,
          [filter]: stamp(since),
          ...(offset === undefined ? {} : { [upper]: stamp(until) }),
        },
        ctx,
      ) as { files?: FileRecord[]; nextOffset?: number | null };
      return {
        items: result.files ?? [],
        next: typeof result.nextOffset === "number" ? result.nextOffset : undefined,
      };
    },
  });
}

const OUTPUT: TriggerDefinition["output"] = [
  { key: "fileId", type: "string", label: "File ID" },
  { key: "fileName", type: "string", label: "File name" },
  { key: "status", type: "string", label: "Status" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

const SAMPLE = {
  fileId: "1234",
  fileName: "leads.csv",
  status: "finished",
  createdAt: "2026-11-09 10:00:00",
  updatedAt: "2026-11-09 10:05:00",
};

export function bulkFileTrigger(
  spec: { updated: boolean },
): TriggerDefinition {
  return spec.updated
    ? {
      key: "new-or-updated-bulk-file",
      title: "New or Updated Bulk File",
      description:
        "The run gets each bulk verification file that is new or changed (progress, status) since the previous check.",
      output: OUTPUT,
      sample: SAMPLE,
      minIntervalMs: 300_000,
      poll: ({ state }, ctx) =>
        check(
          "updatedAtFrom",
          (f) => `${String(f.fileId ?? "")}:${String(f.updatedAt ?? "")}`,
          state,
          ctx,
        ),
    }
    : {
      key: "new-bulk-file",
      title: "New Bulk File",
      description: "The run gets each bulk verification file uploaded since the previous check.",
      output: OUTPUT,
      sample: SAMPLE,
      minIntervalMs: 300_000,
      poll: ({ state }, ctx) => check("createdFrom", (f) => String(f.fileId ?? ""), state, ctx),
    };
}
