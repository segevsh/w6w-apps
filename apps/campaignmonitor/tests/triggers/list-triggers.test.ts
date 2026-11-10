import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newClient from "../../triggers/new-client.ts";
import newSmartEmail from "../../triggers/new-smart-email.ts";
import type { TriggerDefinition } from "@w6w/types";

interface Case {
  name: string;
  trigger: TriggerDefinition;
  params: Record<string, unknown>;
  idKey: string;
  /** Literal URL of the (single) request one check makes. */
  url: string;
}

const cases: Case[] = [
  {
    name: "new-client",
    trigger: newClient,
    params: {},
    idKey: "ClientID",
    url: "https://api.createsend.com/api/v3.3/clients.json",
  },
  {
    name: "new-smart-email (account key, no client)",
    trigger: newSmartEmail,
    params: {},
    idKey: "ID",
    url: "https://api.createsend.com/api/v3.3/transactional/smartEmail",
  },
  {
    name: "new-smart-email (client chosen)",
    trigger: newSmartEmail,
    params: { clientId: "client-1" },
    idKey: "ID",
    url: "https://api.createsend.com/api/v3.3/transactional/smartEmail?clientID=client-1",
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const rec = (id: string) => ({ [c.idKey]: id, Name: `Item ${id}` });
    const poll = async (state: unknown, ids: string[]) => {
      const m = mockCtx([{ status: 200, body: ids.map(rec) }]);
      const r = await c.trigger.poll!({ params: c.params, state, subscriptionId: "s" }, m.ctx);
      return { r, calls: m.calls };
    };

    test("seeds without events, then emits only the new record, idempotently", async () => {
      const seeded = await poll({}, ["a", "b"]);
      assertEquals(seeded.r.events, []);
      assertEquals((seeded.r.nextState as { seeded?: boolean }).seeded, true);
      const first = await poll(seeded.r.nextState, ["a", "b", "c"]);
      const retry = await poll(seeded.r.nextState, ["a", "b", "c"]);
      assertEquals(first.r.events, [rec("c")]);
      assertEquals(retry.r, first.r);
    });

    test("a removed record is not an event", async () => {
      const seeded = await poll({}, ["a", "b"]);
      assertEquals((await poll(seeded.r.nextState, ["a"])).r.events, []);
    });

    test("sends the literal request of the wrapped list action", async () => {
      const { calls } = await poll({}, ["a"]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
    });
  });
}
