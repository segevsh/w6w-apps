import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

export const FILE_PAGE = 50;
export const FILE_MAX_PAGES = 20;

type Poll = NonNullable<TriggerDefinition["poll"]>;

/**
 * Snapshot poll over a folder listing: read every page by offset (50 per request, until a short
 * page), diff the ids, emit the ones not seen before. More than 1000 entries stops with an error
 * rather than truncating. Shared by `new-file` and `new-team-folder-file`.
 */
export function pollFolderFiles(
  name: string,
  list: ActionDefinition,
  parentKey: "folderId" | "teamFolderId",
): Poll {
  return async ({ params, state }, ctx) => {
    const parent = String((params as Record<string, unknown>)[parentKey] ?? "");
    const byId = new Map<string, Record<string, unknown>>();
    for (let n = 0;; n++) {
      if (n >= FILE_MAX_PAGES) {
        throw new Error(
          `${name}: more than ${FILE_MAX_PAGES * FILE_PAGE} items in the folder; too many to watch`,
        );
      }
      const res = await list.execute({
        [parentKey]: parent,
        limit: FILE_PAGE,
        offset: n * FILE_PAGE,
      }, ctx) as { items?: Array<Record<string, unknown>> };
      const items = res.items ?? [];
      for (const item of items) {
        byId.set(String(item.id ?? ""), {
          id: item.id,
          type: item.type,
          attributes: item.attributes,
        });
      }
      if (items.length < FILE_PAGE) break;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      emit: { added: true, updated: false, removed: false },
      rows: [...byId.entries()].map(([key]) => ({ key, values: { id: key } })),
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  };
}

export const fileOutput = [
  { key: "id", type: "string", label: "File or folder ID" },
  { key: "type", type: "string", label: "Resource type" },
  { key: "attributes", type: "object", label: "Attributes (name, created_time, …)" },
] as const;

export const fileSample = {
  id: "sample-file-id",
  type: "files",
  attributes: { name: "Quarterly report.pdf", created_time_in_millisecond: 1618251055482 },
};
