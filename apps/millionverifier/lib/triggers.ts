import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import bulkListFiles from "../actions/bulk-list-files.ts";

const OVERLAP_MS = 120_000;
const PAGE = 50;
export const clock = { now: (): number => Date.now() };

interface FileRecord {
  fileId?: unknown;
  updatedAt?: unknown;
}

/** The vendor's documented filter format, `yyyy-MM-dd HH:mm:ss`. Sent in UTC. */
export function stamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

async function check(
  filter: "createdFrom" | "updatedAtFrom",
  idOf: (file: FileRecord) => string,
  state: unknown,
  ctx: HookContext,
) {
  const checkedAt = clock.now();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const { events, nextState } = await pollNewItems<FileRecord>({
    state,
    idOf,
    maxPages: 3,
    async fetchPage(pageToken) {
      const offset = pageToken === undefined ? 0 : Number(pageToken);
      const result = await bulkListFiles.execute(
        { offset, limit: PAGE, [filter]: stamp(cursor - OVERLAP_MS) },
        ctx,
      ) as { files?: FileRecord[]; nextOffset?: number | null };
      return {
        items: result.files ?? [],
        nextPageToken: typeof result.nextOffset === "number"
          ? String(result.nextOffset)
          : undefined,
      };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } };
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
