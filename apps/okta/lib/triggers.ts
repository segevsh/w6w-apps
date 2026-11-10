import type { HookContext, TriggerDefinition } from "@w6w/types";
import { OktaClient } from "./client.ts";
import { pollWindow } from "./window.ts";

/**
 * Okta documents `search` as "sourced from an eventually consistent datasource", so a user can be
 * visible late. The overlap re-reads a generous window every check; the id window dedupes it.
 */
const OVERLAP_MS = 30 * 60 * 1000;
const PAGE_SIZE = 100;
/** Pages one check reads; a bigger window resumes next check. */
const MAX_PAGES = 5;
const SEEN_WINDOW = 1000;

export const clock = { now: (): number => Date.now() };

interface OktaUser {
  id: string;
  created?: string;
  lastUpdated?: string;
  [key: string]: unknown;
}

/** `created gt "<ISO>"` / `lastUpdated gt "<ISO>"` — the SCIM form Okta documents for `search`. */
export function sinceSearch(field: "created" | "lastUpdated", sinceMs: number): string {
  return `${field} gt "${new Date(sinceMs).toISOString()}"`;
}

/**
 * Newest-first through `search` + `sortBy`/`sortOrder=desc`, so a window that holds more than one
 * page resumes by the oldest user's stamp (`field le "<stamp>"`), never by an offset (brief 9.8).
 */
function check(
  field: "created" | "lastUpdated",
  idOf: (user: OktaUser) => string,
  state: unknown,
  ctx: HookContext,
) {
  const stamp = (user: OktaUser): number | undefined => {
    const ms = Date.parse(String(user[field] ?? ""));
    return Number.isNaN(ms) ? undefined : ms;
  };
  return pollWindow<OktaUser, string>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf,
    tsOf: stamp,
    async load(since, upTo) {
      const search = upTo === undefined
        ? sinceSearch(field, since)
        : `${sinceSearch(field, since)} and ${field} le "${upTo}"`;
      const users = await new OktaClient(ctx).request<OktaUser[] | undefined>("/users", {
        query: { search, limit: PAGE_SIZE, sortBy: field, sortOrder: "desc" },
      });
      const items = Array.isArray(users) ? users : [];
      const oldest = items.length >= PAGE_SIZE ? stamp(items[items.length - 1]) : undefined;
      return {
        items,
        next: oldest === undefined ? undefined : new Date(oldest).toISOString(),
      };
    },
  });
}

export function checkNewUser(state: unknown, ctx: HookContext) {
  return check("created", (user) => String(user.id), state, ctx);
}

export function checkNewOrUpdatedUser(state: unknown, ctx: HookContext) {
  return check("lastUpdated", (user) => `${user.id}:${user.lastUpdated ?? ""}`, state, ctx);
}

const output: TriggerDefinition["output"] = [
  { key: "id", type: "string", label: "User ID" },
  { key: "status", type: "string", label: "Status" },
  { key: "created", type: "string", label: "Created" },
  { key: "lastUpdated", type: "string", label: "Last updated" },
  { key: "profile", type: "object", label: "Profile" },
];

const sample = {
  id: "00u1ero7vZFVEIYLWPBN",
  status: "ACTIVE",
  created: "2026-11-10T10:00:00.000Z",
  lastUpdated: "2026-11-10T10:00:00.000Z",
  profile: { login: "jane@example.com", email: "jane@example.com" },
};

export const newUserTrigger: TriggerDefinition = {
  key: "new-user",
  title: "New User",
  description: "The run gets each newly created Okta user.",
  output,
  sample,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewUser(state, ctx);
  },
};

export const newOrUpdatedUserTrigger: TriggerDefinition = {
  key: "new-or-updated-user",
  title: "New or Updated User",
  description: "The run gets each Okta user that is newly created or changed.",
  output,
  sample,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewOrUpdatedUser(state, ctx);
  },
};
