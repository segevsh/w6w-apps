import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import foldersList from "../actions/folders-list.ts";

/**
 * `POST /api/1/folders/list` answers the account's whole set of user-created folders in one
 * request (a handful per account), so the collection is a bounded snapshot: a new key is a new folder.
 */
const trigger: TriggerDefinition = {
  key: "new-folder",
  title: "New Folder",
  description: "The run gets each newly created Instapaper folder.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Folder ID" },
    { key: "values", type: "object", label: "Folder" },
  ],
  sample: {
    change: "added",
    key: "1",
    values: { type: "folder", folder_id: 1, title: "Reading" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await foldersList.execute({}, ctx) as {
      folders?: Array<{ folder_id?: number }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.folders ?? []).flatMap((f) =>
        f.folder_id === undefined ? [] : [{ key: String(f.folder_id), values: f }]
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
