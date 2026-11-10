import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listSenders from "../actions/list-senders.ts";

interface Sender {
  id: number | string;
  name?: string;
  email?: string;
  active?: boolean;
}

/**
 * `GET /senders` returns every sender identity on the account in one unpaged response (a handful;
 * https://developers.brevo.com/reference/get-senders, read 2026-11-10): no order, no timestamps,
 * so each check diffs the ids against the previous one (`pollSnapshot`, added only).
 */
const newSender: TriggerDefinition = {
  key: "new-sender",
  title: "New Sender",
  description: "The run gets each sender identity newly added to the Brevo account.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Sender ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "active", type: "boolean", label: "Active" },
  ],
  sample: { id: 3, name: "Acme Support", email: "support@example.com", active: true },
  async poll({ state }, ctx) {
    const action = listSenders as unknown as ActionDefinition;
    const result = await action.execute({}, ctx) as { senders?: Sender[] };
    const byId = new Map<string, Sender>();
    for (const s of Array.isArray(result?.senders) ? result.senders : []) {
      if (s?.id === undefined || s.id === null || String(s.id) === "") {
        throw new Error("Brevo list senders returned a sender without id");
      }
      byId.set(String(s.id), s);
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default newSender;
