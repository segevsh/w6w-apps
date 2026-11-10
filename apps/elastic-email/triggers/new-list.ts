import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listList from "../actions/list-list.ts";

const CAP = 5000;

/**
 * Small bounded collection: `GET /v4/lists` "returns all your existing lists" (Elastic Email v4
 * OpenAPI); an account holds tens of contact lists. One request asks for up to 5000 and the whole
 * set is diffed each check; if the answer fills the request the check fails with an error naming
 * the cap instead of silently dropping rows.
 */
const trigger: TriggerDefinition = {
  key: "new-list",
  title: "New List",
  description: "The run gets each contact list newly created in the Elastic Email account.",
  output: [
    { key: "ListName", type: "string", label: "List name" },
    { key: "PublicListID", type: "string", label: "Public list ID" },
    { key: "DateAdded", type: "string", label: "Date added" },
  ],
  sample: {
    ListName: "Newsletter",
    PublicListID: "6f2d9f1a-0c3b-4d52-9d0c-3a1b2c4d5e6f",
    DateAdded: "2026-11-09T12:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const out = await listList.execute({ limit: CAP }, ctx) as {
      items?: Array<{ PublicListID?: unknown }>;
    };
    const lists = Array.isArray(out?.items) ? out.items : [];
    if (lists.length >= CAP) {
      throw new Error(
        `Elastic Email account has ${CAP} or more lists; the New List trigger is capped there`,
      );
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: lists.map((list) => ({ key: String(list.PublicListID ?? ""), values: list })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
