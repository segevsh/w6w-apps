import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/playlist-get-user-playlists.ts";

interface Playlist {
  id: string;
}

const PAGE_SIZE = 50;
/** 10 pages of 50: playlists beyond 500 are refused rather than silently dropped. */
const MAX_PAGES = 10;

/**
 * The user's playlist library is read whole through the `playlist-get-user-playlists` request —
 * `GET /me/playlists?limit=50&offset=<n>` — following `offset` until the response has no `next`.
 * A library with more than 500 playlists throws (a snapshot of a partial page would report playlists
 * that merely shifted into view as new).
 */
async function playlists(ctx: HookContext) {
  const rows: Array<{ key: string; values: Playlist }> = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await action.execute!({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }, ctx) as {
      items?: Playlist[];
      next?: string | null;
    };
    for (const p of res.items ?? []) rows.push({ key: String(p.id), values: p });
    if (!res.next) return rows;
  }
  throw new Error(
    `Spotify library has more than ${MAX_PAGES * PAGE_SIZE} playlists; too many to snapshot`,
  );
}

export const newPlaylistTrigger: TriggerDefinition = {
  key: "new-playlist",
  title: "New Playlist",
  description: "The run gets each playlist newly created or followed by the connected user.",
  output: [
    { key: "id", type: "string", label: "Playlist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "public", type: "boolean", label: "Public" },
    { key: "collaborative", type: "boolean", label: "Collaborative" },
    { key: "owner", type: "object", label: "Owner (id, display_name)" },
    { key: "uri", type: "string", label: "Spotify URI" },
  ],
  sample: {
    id: "37i9dQZF1DXcBWIGoYBM5M",
    name: "Today's Top Hits",
    public: true,
    collaborative: false,
    owner: { id: "spotify", display_name: "Spotify" },
    uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const { events, nextState } = await pollSnapshot({
      state,
      rows: await playlists(ctx),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => e.values as Playlist), nextState };
  },
};
