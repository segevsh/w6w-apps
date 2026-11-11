import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listGetCards from "../actions/list-get-cards.ts";

interface Params {
  listId?: string;
}

/**
 * Small bounded collection (brief §9.1 c): `GET /lists/{id}/cards` answers the open cards in one
 * list, and Trello allows at most 5000 open cards per board
 * (https://developer.atlassian.com/cloud/trello/guides/rest-api/limits/ , verified 2026-11-10), so
 * a list never outgrows `pollSnapshot`'s 5000-row cap. The action is called without a `limit`.
 * A card that is moved into the list counts as new in it; edits and moves out do not emit.
 */
const trigger: TriggerDefinition<Params> = {
  key: "new-card-in-list",
  title: "New Card In List",
  description:
    "The run gets each card that newly appears in the chosen Trello list, whether it was created there or moved in (checked on a schedule; no Power-Up secret needed).",
  params: [{
    key: "listId",
    label: "List ID",
    type: "string",
    required: true,
    hint: "The Trello list to watch. Find it with the Get Lists action on a board.",
  }],
  output: [
    { key: "id", type: "string", label: "Card ID" },
    { key: "name", type: "string", label: "Card name" },
    { key: "idList", type: "string", label: "List ID" },
    { key: "idBoard", type: "string", label: "Board ID" },
    { key: "shortLink", type: "string", label: "Card short link" },
  ],
  sample: {
    id: "5f0a1b2c3d4e5f6a7b8c9d0f",
    name: "Write the spec",
    idList: "5f0a1b2c3d4e5f6a7b8c9d10",
    idBoard: "4d5ea62fd76aa1136000000c",
    shortLink: "AbCdEfGh",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const listId = params.listId?.trim();
    if (!listId) throw new Error("Set the List ID of the Trello list to watch.");
    const cards = await listGetCards.execute({ id: listId }, ctx);
    const rows = Array.isArray(cards) ? cards as Array<{ id?: unknown }> : [];
    const { events, nextState } = await pollSnapshot({
      state,
      rows: rows.map((card) => ({ key: String(card.id ?? ""), values: card })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
