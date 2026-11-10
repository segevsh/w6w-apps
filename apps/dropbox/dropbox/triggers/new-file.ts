import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listFolder from "../actions/list-folder.ts";

const PAGE = 200;
const MAX_PAGES = 3;

/**
 * Wraps `list-folder` (`POST /2/files/list_folder`, then `/files/list_folder/continue`) on ONE
 * folder the user names (not recursive). The folder must fit in three pages of 200 entries: a
 * bigger folder makes the check fail with a clear error instead of dropping entries silently.
 */
const trigger: TriggerDefinition = {
  key: "new-file",
  title: "New File or Folder",
  description: "The run gets each file or subfolder newly added to a Dropbox folder.",
  params: [{
    key: "path",
    label: "Folder path",
    type: "string",
    hint: 'e.g. "/Invoices". Leave empty for the root. Subfolders are not searched.',
  }],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: ".tag", type: "string", label: "file or folder" },
    { key: "name", type: "string", label: "Name" },
    { key: "path_display", type: "string", label: "Path" },
    { key: "server_modified", type: "string", label: "Modified at (files)" },
  ],
  sample: {
    ".tag": "file",
    id: "id:a4ayc_80_OEAAAAAAAAAXw",
    name: "invoice-0042.pdf",
    path_display: "/Invoices/invoice-0042.pdf",
    server_modified: "2026-11-09T10:00:00Z",
    size: 7212,
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const path = String((params as { path?: unknown }).path ?? "");
    const entries: Array<Record<string, unknown>> = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await (listFolder as ActionDefinition).execute(
        cursor ? { cursor } : { path, recursive: false, limit: PAGE },
        ctx,
      ) as { entries?: Array<Record<string, unknown>>; cursor?: string; has_more?: boolean };
      entries.push(...(result.entries ?? []));
      if (!result.has_more) break;
      if (page === MAX_PAGES - 1) {
        throw new Error(
          `Dropbox folder holds more than ${PAGE * MAX_PAGES} entries; too large to poll`,
        );
      }
      cursor = result.cursor;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: entries.map((entry) => ({
        key: String(entry.id ?? entry.path_lower ?? ""),
        values: { name: entry.name, path: entry.path_lower, rev: entry.rev },
      })),
      emit: { added: true, updated: false },
    });
    const byKey = new Map(
      entries.map((entry) => [String(entry.id ?? entry.path_lower ?? ""), entry]),
    );
    return { events: events.map((change) => byKey.get(change.key) ?? change.values), nextState };
  },
};

export default trigger;
