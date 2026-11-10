import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

const PAGE_SIZE = 100;
/** 50 pages x 100 users, the kit's 5000-row ceiling; more is refused rather than compared. */
const MAX_PAGES = 50;

/**
 * Small bounded collection (brief 9.1 c): `GET /v1/users` lists the account's users, 100 per page
 * at most (https://developer.iclosed.io, OpenAPI `List account users`, verified 2026-11-10); a
 * workspace holds its team, not a feed. The whole list is read and compared check to check; only
 * added users fire. No order is documented, so a partial read is never compared.
 */
const trigger: TriggerDefinition = {
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the iClosed account (checked on a schedule).",
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const users: Array<{ id?: unknown }> = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const out = await userList.execute({ limit: PAGE_SIZE, page }, ctx) as {
        data?: { users?: Array<{ id?: unknown }> };
      };
      const got = out?.data?.users ?? [];
      users.push(...got);
      if (got.length < PAGE_SIZE) break;
      if (page === MAX_PAGES - 1) {
        throw new Error("iClosed returned more users than New User can compare in one check.");
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: users.map((user) => ({ key: String(user.id ?? ""), values: user })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
  ],
  sample: {
    id: 5,
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@example.test",
    role: "CLOSER",
  },
};

export default trigger;
