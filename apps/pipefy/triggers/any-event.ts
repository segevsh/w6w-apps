import { webhookTrigger } from "../lib/triggers.ts";

/**
 * Pipefy, any event: registers one webhook for the chosen `events` (comma-separated Pipefy webhook
 * actions; empty = every card event) and delivers only those
 * (https://developers.pipefy.com/reference/pipe-table-webhooks, verified 2026-11-10).
 */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Pipefy pipe or table webhook action you choose (card created, moved, done, deleted, field updated, comment, email received, late, overdue, expired, activities export finished, automation execution). Leave Events empty for every card event. The run gets the action, the card and pipe ids where the payload has them, and the full payload.",
  action: "card.create",
  anyEvent: true,
  sample: {
    action: "card.move",
    cardId: "123456",
    cardTitle: "Prospect 1",
    pipeId: "CxeXHeOR",
    phase: null,
    fromPhase: { id: 123, name: "Inbox" },
    toPhase: { id: 345, name: "Doing" },
    user: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
    data: {
      action: "card.move",
      from: { id: 123, name: "Inbox" },
      to: { id: 345, name: "Doing" },
      moved_by: { id: 12345, name: "Ada Lovelace", username: "ada", email: "ada@example.com" },
      card: { id: 123456, title: "Prospect 1", pipe_id: "CxeXHeOR" },
    },
  },
});

export default anyEvent;
