import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import driveList from "../actions/drive-list.ts";
import { fileId } from "../lib/triggers.ts";

const PAGE = 100;
const MAX_PAGES = 5;

/**
 * Shared drives the connected user can see: `drives.list` is a bounded collection (a user belongs
 * to few shared drives, pageSize max 100), read up to five pages and compared with the last
 * check. More than 500 shared drives fails the check with a clear error rather than dropping
 * entries. https://developers.google.com/workspace/drive/api/reference/rest/v3/drives/list
 */
const newSharedDrive: TriggerDefinition = {
  key: "new-shared-drive",
  title: "New Shared Drive",
  description:
    "Polls the shared drives the connected account can see and fires for each new one. The run gets the shared drive.",
  output: [
    { key: "id", label: "Shared drive ID", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "createdTime", label: "Created time", type: "string" },
  ],
  sample: {
    kind: "drive#drive",
    id: "0AIvKq2xTPtbOUk9PVA",
    name: "Finance",
    createdTime: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const drives: Array<Record<string, unknown>> = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await (driveList as ActionDefinition).execute(
        { pageSize: PAGE, pageToken },
        ctx,
      ) as { drives?: Array<Record<string, unknown>>; nextPageToken?: string };
      drives.push(...(result.drives ?? []));
      if (!result.nextPageToken) break;
      if (page === MAX_PAGES - 1) {
        throw new Error(
          `Google Drive lists more than ${PAGE * MAX_PAGES} shared drives; too many to poll`,
        );
      }
      pageToken = result.nextPageToken;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: drives.map((d) => ({ key: fileId(d), values: { name: d.name } })),
      emit: { added: true, updated: false },
    });
    const byKey = new Map(drives.map((d) => [fileId(d), d]));
    return { events: events.map((c) => byKey.get(c.key) ?? c.values), nextState };
  },
};

export default newSharedDrive;
