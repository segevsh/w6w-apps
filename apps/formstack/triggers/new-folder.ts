import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import folderList from "../actions/folder-list.ts";

const PER_PAGE = 500;

/**
 * Bounded snapshot: `GET /folders` takes `page` and `perPage` (minimum 10) with no filter or order,
 * and an account holds a handful of folders, so they are read in one request and diffed by id. The
 * answer carries `page.totalPages`: when it is more than 1 the check fails with an error naming the
 * cap, never a silent partial read (Formstack API V2025, Folders, List folders).
 */
const trigger: TriggerDefinition = {
  key: "new-folder",
  title: "New Folder",
  description: "The run gets each folder newly created in the Formstack account.",
  output: [
    { key: "id", type: "number", label: "Folder ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 42, name: "Marketing forms" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await folderList.execute({ page: 1, perPage: PER_PAGE }, ctx) as {
      page?: { totalPages?: number };
      folders?: Array<{ id?: unknown }> | null;
    };
    if (Number(out?.page?.totalPages ?? 1) > 1) {
      throw new Error(
        `Formstack account has more than ${PER_PAGE} folders; the New Folder trigger is capped there`,
      );
    }
    const folders = Array.isArray(out?.folders) ? out.folders : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: folders.map((folder) => ({ key: String(folder.id ?? ""), values: folder })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
