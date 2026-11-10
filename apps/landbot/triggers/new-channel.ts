import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import channelList from "../actions/channel-list.ts";

const PAGE = 100;
/** 50 pages of 100 = the kit's 5000-row snapshot ceiling. */
const MAX_PAGES = 50;

/**
 * `GET /channels/` lists the workspace's channels (a bounded set: one per bot channel). The whole
 * set is read through the action's own `offset`/`nextOffset` paging, and a new id is a new channel.
 */
const trigger: TriggerDefinition = {
  key: "new-channel",
  title: "New Channel",
  description: "The run gets each channel newly added to the Landbot workspace.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Channel ID" },
    { key: "values", type: "object", label: "Channel" },
  ],
  sample: {
    change: "added",
    key: "1234",
    values: { id: 1234, name: "Website bot", type: "landbot" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows: Array<{ key: string; values: unknown }> = [];
    let offset = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await channelList.execute({ offset, limit: PAGE }, ctx) as {
        channels?: Array<{ id?: number | string }>;
        nextOffset?: number | null;
      };
      for (const c of res.channels ?? []) {
        if (c.id !== undefined) rows.push({ key: String(c.id), values: c });
      }
      if (typeof res.nextOffset !== "number") break;
      offset = res.nextOffset;
    }
    return await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
