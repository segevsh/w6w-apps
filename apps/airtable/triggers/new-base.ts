import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listBases from "../actions/list-bases.ts";

const MAX_PAGES = 50; // 50 pages (100 bases each) = the snapshot kit's 5000-row cap

interface Base {
  id: string;
  name?: string;
  permissionLevel?: string;
}

/**
 * `GET /meta/bases` lists the bases the token can open: no sort order, no timestamps, but a small
 * set (an `offset` cursor pages it; https://airtable.com/developers/web/api/list-bases, 2026-11-10).
 * Every check reads all pages and diffs the ids against the previous check (`pollSnapshot`, added
 * only).
 */
const newBase: TriggerDefinition = {
  key: "new-base",
  title: "New Base",
  description:
    "Fires when a new base becomes accessible to the connected Airtable token. The run gets the base's id, name and permission level.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Base ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "permissionLevel", type: "string", label: "Permission level" },
  ],
  sample: { id: "appA1B2C3D4E5F6G", name: "Product roadmap", permissionLevel: "create" },
  async poll({ state }, ctx) {
    const action = listBases as unknown as ActionDefinition;
    const all: Base[] = [];
    let offset: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await action.execute({ offset }, ctx) as { bases?: Base[]; offset?: string };
      all.push(...(Array.isArray(result?.bases) ? result.bases : []));
      offset = result?.offset;
      if (!offset) break;
    }
    const byId = new Map<string, Base>();
    for (const b of all) {
      if (typeof b?.id !== "string" || b.id === "") {
        throw new Error("Airtable list bases returned a base without id");
      }
      byId.set(b.id, b);
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default newBase;
