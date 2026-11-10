import type { OutputField, TriggerDefinition } from "@w6w/types";
import { SNAPSHOT_OUTPUT, snapshotPoll } from "../lib/triggers.ts";
import spaceList from "../actions/space-list.ts";

/**
 * `GET /spaces` (the `space-list` action), read page by page and diffed: the Network's spaces are
 * a small bounded collection and the Admin API documents no sort order or since filter on the list.
 * Docs (verified 2026-11-10): https://docs.mightynetworks.com/llms.txt (Admin API v1 / Spaces)
 */
const newSpace: TriggerDefinition = {
  key: "new-space",
  title: "New Space",
  description:
    "The run gets each space newly created in your Network (no webhook event announces a new space): the space (id, name, collection id, created time).",
  output: SNAPSHOT_OUTPUT as OutputField[],
  sample: {
    change: "added",
    key: "111",
    values: {
      id: 111,
      name: "General",
      collection_id: 5,
      created_at: "2026-11-10T10:30:00Z",
      updated_at: "2026-11-10T10:30:00Z",
    },
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return snapshotPoll({
      state,
      label: "spaces",
      fetchPage: (page, perPage) => spaceList.execute({ page, perPage }, ctx),
    });
  },
};

export default newSpace;
