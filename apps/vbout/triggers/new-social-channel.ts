import socialChannelList from "../actions/social-channel-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /1/socialmedia/channels.json` through `social-channel-list`: the response is
 * `{ channels: { <Network>: { count, <pages|profiles>: [{ id, … }] } } }`
 * (https://developers.vbout.com/scripts/openapi.json, `SocialMedia/Channels`) with no paging, so
 * every connected account of every network is flattened to `{ network, id, … }` and
 * snapshot-diffed (additions only).
 */
export default snapshotTrigger({
  key: "new-social-channel",
  title: "New Social Channel",
  description: "The run gets each social media account (page or profile) newly connected in Vbout.",
  output: [
    { key: "network", type: "string", label: "Network" },
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Page or profile name" },
  ],
  sample: { network: "Facebook", id: "510584708978405", name: "Spotless TV" },
  rows: async (_params, ctx) => {
    const out = await socialChannelList.execute({} as never, ctx) as {
      channels?: Record<string, unknown>;
    };
    const rows: unknown[] = [];
    for (const [network, group] of Object.entries(out.channels ?? {})) {
      for (const list of Object.values((group ?? {}) as Record<string, unknown>)) {
        if (!Array.isArray(list)) continue;
        for (const account of list) {
          const a = account as Record<string, unknown>;
          rows.push({ network, ...a, name: a.name ?? a.screenname ?? a.fullname });
        }
      }
    }
    return rows;
  },
  idOf: (item) => {
    const i = item as { network?: unknown; id?: unknown };
    return `${i.network}:${i.id}`;
  },
});
