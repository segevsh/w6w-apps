import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newOrUpdatedClient from "../../triggers/new-or-updated-client.ts";
import newOrUpdatedJob from "../../triggers/new-or-updated-job.ts";
import newQuote from "../../triggers/new-quote.ts";
import newRequest from "../../triggers/new-request.ts";
import newVisit from "../../triggers/new-visit.ts";

const URL_ = "https://api.getjobber.com/api/graphql";

interface Case {
  name: string;
  trigger: typeof newQuote;
  field: string;
  /** The item stamped with an update time, when the id carries one (brief 9.2). */
  updated: boolean;
  /** The literal `sort` variable: an object for clients, a list elsewhere (see the actions). */
  sort: unknown;
}

const cases: Case[] = [
  {
    name: "new-or-updated-client",
    trigger: newOrUpdatedClient,
    field: "clients",
    updated: true,
    sort: { key: "UPDATED_AT", direction: "DESCENDING" },
  },
  {
    name: "new-or-updated-job",
    trigger: newOrUpdatedJob,
    field: "jobs",
    updated: true,
    sort: [{ key: "UPDATED_AT", direction: "DESCENDING" }],
  },
  {
    name: "new-quote",
    trigger: newQuote,
    field: "quotes",
    updated: false,
    sort: [{ key: "CREATED_AT", direction: "DESCENDING" }],
  },
  {
    name: "new-request",
    trigger: newRequest,
    field: "requests",
    updated: false,
    sort: [{ key: "REQUESTED_AT", direction: "DESCENDING" }],
  },
  {
    name: "new-visit",
    trigger: newVisit,
    field: "visits",
    updated: false,
    sort: [{ key: "CREATED_AT", direction: "DESCENDING" }],
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const item = (id: string, stamp = "1") => ({ id, updatedAt: stamp });
    const run = async (state: unknown, items: unknown[]) => {
      const mock = mockCtx([{ body: { data: { [c.field]: { nodes: items } } } }]);
      const result = await c.trigger.poll!({ params: {}, state }, mock.ctx);
      return { result, calls: mock.calls };
    };

    test("seeds without emitting", async () => {
      const { result } = await run({}, [item("a")]);
      assertEquals(result.events, []);
      assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
    });

    test("emits only the new record, and a retry is identical", async () => {
      const seeded = (await run({}, [item("a")])).result.nextState;
      const first = await run(seeded, [item("b"), item("a")]);
      assertEquals(first.result.events, [item("b")]);
      assertEquals((await run(seeded, [item("b"), item("a")])).result, first.result);
    });

    test("requests the literal sort of the wrapped list action", async () => {
      const { calls } = await run({}, [item("a")]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "POST");
      assertEquals(calls[0].url, URL_);
      const variables = JSON.parse(calls[0].body ?? "{}").variables;
      assertEquals(variables.sort, c.sort);
      assertEquals(variables.first, 100);
    });

    if (c.updated) {
      test("an edited record is a new event (id carries updatedAt)", async () => {
        const seeded = (await run({}, [item("a", "1")])).result.nextState;
        const edited = await run(seeded, [item("a", "2")]);
        assertEquals(edited.result.events, [item("a", "2")]);
      });
    }
  });
}
