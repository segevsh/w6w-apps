import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

/**
 * `PUT /lists/{id}/closed` toggles the list's own archived flag. Trello's
 * separate "archive every card in this list" endpoint is
 * `POST /lists/{id}/archiveAllCards`, which is what this action calls.
 */
const listArchiveAllCards: ActionDefinition<{ id: string }> = {
  key: "list-archive-all-cards",
  type: "perform",
  resource: "list",
  title: "Archive All Cards in List",
  description: "Archive every card currently in a list, leaving the list itself in place.",
  // Cards already archived stay archived; replaying converges.
  idempotent: true,
  params: [{ key: "id", label: "List ID", type: "string", required: true }],
  output: [{ key: "", type: "array", label: "Result" }],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/lists/${encodeURIComponent(input.id)}/archiveAllCards`,
      { method: "POST" },
    );
  },
};

export default listArchiveAllCards;
