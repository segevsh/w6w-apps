import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

/**
 * Okta documents `search` as "sourced from an eventually consistent datasource", so a user can be
 * visible late. The overlap re-reads a generous window every check; the id window dedupes it.
 */
const OVERLAP_MS = 30 * 60 * 1000;
const PAGE_SIZE = 100;
const SEEN_WINDOW = 400;

export const clock = { now: (): number => Date.now() };

interface OktaUser {
  id: string;
  lastUpdated?: string;
  [key: string]: unknown;
}

/** `created gt "<ISO>"` / `lastUpdated gt "<ISO>"` — the SCIM form Okta documents for `search`. */
export function sinceSearch(field: "created" | "lastUpdated", cursor: number): string {
  return `${field} gt "${new Date(cursor - OVERLAP_MS).toISOString()}"`;
}

async function check(
  field: "created" | "lastUpdated",
  idOf: (user: OktaUser) => string,
  state: unknown,
  ctx: HookContext,
) {
  const checkedAt = clock.now();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const { events, nextState } = await pollNewItems<OktaUser>({
    state,
    maxPages: 1,
    maxEvents: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf,
    async fetchPage() {
      const users = await userList.execute(
        { search: sinceSearch(field, cursor), limit: PAGE_SIZE },
        ctx,
      ) as OktaUser[] | undefined;
      return { items: Array.isArray(users) ? users : [] };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } };
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
