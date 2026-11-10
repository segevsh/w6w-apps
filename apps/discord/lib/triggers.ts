import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listChannels from "../actions/list-channels.ts";
import listGuilds from "../actions/list-guilds.ts";
import listMembers from "../actions/list-members.ts";
import listRoles from "../actions/list-roles.ts";

/**
 * Discord "New <record>" triggers over a bounded collection (brief section 9.1 (c)). Discord's
 * HTTP API has no newest-first order and no since-filter for servers, channels, roles or members,
 * and its realtime events (guild/channel/role/member create) are Gateway-only (a WebSocket, not a
 * webhook), so each trigger lists the whole collection through the SAME action the app already
 * ships (same client, same endpoint) and `pollSnapshot` emits the ids it has not seen.
 * https://discord.com/developers/docs/events/overview (verified 2026-11-10).
 */

export const MAX_ROWS = 5000;

const GUILD_ID: Param = {
  key: "guildId",
  label: "Server (Guild) ID",
  type: "string",
  required: true,
  hint: "Enable Developer Mode in Discord, then right-click the server and choose Copy Server ID.",
};

interface SnapshotSpec<P> {
  key: string;
  title: string;
  description: string;
  params: Param[];
  output: OutputField[];
  sample: unknown;
  rows(params: P, ctx: HookContext): Promise<Array<{ key: string; values: unknown }>>;
}

function snapshotTrigger<P>(spec: SnapshotSpec<P>): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      return await pollSnapshot({
        state,
        maxRows: MAX_ROWS,
        emit: { added: true, updated: false },
        rows: await spec.rows(params, ctx),
      });
    },
  } as TriggerDefinition<P>;
}

const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

const CHANGE_OUTPUT: OutputField[] = [
  { key: "change", type: "string", label: "Change (always added)" },
  { key: "key", type: "string", label: "ID" },
  { key: "values", type: "object", label: "Record" },
];

export const newGuild = snapshotTrigger<Record<string, never>>({
  key: "new-guild",
  title: "New Server",
  description:
    "The run gets each server the bot (or user) newly joined. The first check records the current servers without firing.",
  params: [],
  output: CHANGE_OUTPUT,
  sample: {
    change: "added",
    key: "80351110224678912",
    values: { id: "80351110224678912", name: "1337 Krew", owner: false },
  },
  async rows(_params, ctx) {
    // GET /users/@me/guilds: 1-200 per page, `after` is a guild-id cursor
    // (https://discord.com/developers/docs/resources/user#get-current-user-guilds).
    const rows: Array<{ key: string; values: unknown }> = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_ROWS / 200 + 1; page++) {
      const res = await listGuilds.execute({ limit: 200, after }, ctx) as { guilds?: unknown[] };
      const guilds = res.guilds ?? [];
      for (const g of guilds) rows.push({ key: idOf(g), values: g });
      if (guilds.length < 200) break;
      after = idOf(guilds[guilds.length - 1]);
    }
    return rows;
  },
});

export const newChannel = snapshotTrigger<{ guildId: string }>({
  key: "new-channel",
  title: "New Channel",
  description:
    "The run gets each channel newly created in the server. The first check records the current channels without firing.",
  params: [GUILD_ID],
  output: CHANGE_OUTPUT,
  sample: {
    change: "added",
    key: "41771983423143937",
    values: { id: "41771983423143937", type: 0, name: "general", guild_id: "290926798999357250" },
  },
  async rows({ guildId }, ctx) {
    // GET /guilds/{id}/channels returns every channel of the server (no pagination, no threads).
    const res = await listChannels.execute({ guildId }, ctx) as { channels?: unknown[] };
    return (res.channels ?? []).map((c) => ({ key: idOf(c), values: c }));
  },
});

export const newRole = snapshotTrigger<{ guildId: string }>({
  key: "new-role",
  title: "New Role",
  description:
    "The run gets each role newly created in the server. The first check records the current roles without firing.",
  params: [GUILD_ID],
  output: CHANGE_OUTPUT,
  sample: {
    change: "added",
    key: "41771983423143936",
    values: { id: "41771983423143936", name: "Moderator", color: 3447003, position: 2 },
  },
  async rows({ guildId }, ctx) {
    // GET /guilds/{id}/roles returns every role of the server (no pagination).
    const res = await listRoles.execute({ guildId }, ctx) as { roles?: unknown[] };
    return (res.roles ?? []).map((r) => ({ key: idOf(r), values: r }));
  },
});

export const newMember = snapshotTrigger<{ guildId: string }>({
  key: "new-member",
  title: "New Member",
  description:
    "The run gets each member who newly joined the server (servers up to 5000 members). Needs the Server Members privileged intent. The first check records the current members without firing.",
  params: [GUILD_ID],
  output: CHANGE_OUTPUT,
  sample: {
    change: "added",
    key: "82198898841029460",
    values: {
      user: { id: "82198898841029460", username: "example-user" },
      roles: [],
      joined_at: "2026-11-10T10:00:00.000000+00:00",
    },
  },
  async rows({ guildId }, ctx) {
    // GET /guilds/{id}/members: limit 1-1000, `after` is the highest user id of the previous
    // page, ascending by user id (https://discord.com/developers/docs/resources/guild#list-guild-members).
    // Read one page past the cap so a larger server fails loudly (pollSnapshot names the cap).
    const rows: Array<{ key: string; values: unknown }> = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_ROWS / 1000 + 1; page++) {
      const res = await listMembers.execute({ guildId, limit: 1000, after }, ctx) as {
        members?: unknown[];
      };
      const members = res.members ?? [];
      for (const m of members) {
        rows.push({ key: idOf((m as { user?: unknown }).user), values: m });
      }
      if (members.length < 1000) break;
      after = idOf((members[members.length - 1] as { user?: unknown }).user);
    }
    return rows;
  },
});
