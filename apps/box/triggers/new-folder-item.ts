import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listFolderItems from "../actions/list-folder-items.ts";

const PAGE = 1000;
const MAX_PAGES = 5;

type Params = { folderId?: string };
type Entry = Record<string, unknown>;

/**
 * Wraps `list-folder-items` (`GET /folders/{id}/items`) on ONE folder the user names (not
 * recursive). Box sorts a folder's items by type first (folders, then files, then web links) with
 * the chosen attribute only second (https://developer.box.com/reference/get-folders-id-items/), so
 * there is no newest-first order to page by: the whole folder is read (offset paging, up to five
 * pages of 1000) and compared with the last check. A folder over 5000 items makes the check fail
 * with a clear error instead of dropping entries; the File Uploaded webhook trigger is the choice
 * for those.
 */
const newFolderItem: TriggerDefinition<Params> = {
  key: "new-folder-item",
  title: "New File or Folder in a Folder",
  description:
    "Polls one Box folder (not its subfolders) and fires for each file, folder or web link that appears in it, including items moved or copied in. The run gets the new item.",
  params: [{
    key: "folderId",
    label: "Folder ID",
    type: "string",
    required: true,
    hint: 'The Box id of the folder to watch. "0" is the root folder. Up to 5000 items.',
  }],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "type", type: "string", label: "file, folder or web_link" },
    { key: "name", type: "string", label: "Name" },
    { key: "etag", type: "string", label: "ETag" },
  ],
  sample: {
    type: "file",
    id: "987654321",
    etag: "1",
    sequence_id: "1",
    name: "report.pdf",
    sha1: "0123456789abcdef0123456789abcdef01234567",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const folderId = String((params as Params).folderId ?? "").trim();
    if (!folderId) throw new Error("Enter the id of the Box folder to watch.");
    const entries: Entry[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await (listFolderItems as ActionDefinition).execute(
        { folderId, limit: PAGE, offset: page * PAGE },
        ctx,
      ) as { entries?: Entry[] };
      const got = result.entries ?? [];
      entries.push(...got);
      if (got.length < PAGE) break;
      if (page === MAX_PAGES - 1) {
        throw new Error(`Box folder holds more than ${PAGE * MAX_PAGES} items; too large to poll`);
      }
    }
    const keyOf = (e: Entry) => `${String(e.type ?? "")}:${String(e.id ?? "")}`;
    const { events, nextState } = await pollSnapshot({
      state,
      rows: entries.map((e) => ({ key: keyOf(e), values: { name: e.name } })),
      emit: { added: true, updated: false },
    });
    const byKey = new Map(entries.map((e) => [keyOf(e), e]));
    return { events: events.map((c) => byKey.get(c.key) ?? c.values), nextState };
  },
};

export default newFolderItem;
