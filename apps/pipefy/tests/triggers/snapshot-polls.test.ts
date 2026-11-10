import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newPhase from "../../triggers/new-phase.ts";
import newTable from "../../triggers/new-table.ts";

// Each case: the trigger, its params, a response builder, and the literal GraphQL it must send.
const CASES = [
  {
    name: "new-phase",
    trigger: newPhase,
    params: { pipeId: "302345678" },
    respond: (rows: unknown[]) => ({ data: { pipe: { phases: rows } } }),
    query: "{ pipe(id: 302345678) { phases {",
  },
  {
    name: "new-table",
    trigger: newTable,
    params: { organizationId: "12345" },
    respond: (rows: unknown[]) => ({
      data: { organization: { tables: { edges: rows.map((node) => ({ node })) } } },
    }),
    query: "{ organization(id: 12345) { tables { edges { node { id name internal_id } } } } }",
  },
  {
    name: "new-organization",
    trigger: newOrganization,
    params: {},
    respond: (rows: unknown[]) => ({ data: { organizations: rows } }),
    query: "{ organizations { id name } }",
  },
] as const;

for (const c of CASES) {
  const row = (id: string, name: string) => ({ id, name });
  const input = { params: c.params, subscriptionId: "sub-1" };
  const run = (state: unknown, rows: unknown[]) => {
    const m = mockCtx([{ body: c.respond(rows) }]);
    return {
      m,
      out: (c.trigger.poll as (
        i: unknown,
        ctx: unknown,
      ) => Promise<{ events: unknown[]; nextState: unknown }>)({ ...input, state }, m.ctx),
    };
  };

  test(`${c.name}: seeds without events, emits only an added row (not an edit), retries idempotently, sends the literal query`, async () => {
    const seed = run({}, [row("1", "A")]);
    const seeded = await seed.out;
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.m.calls.length, 1);
    assertEquals(seed.m.calls[0].method, "POST");
    assertEquals(seed.m.calls[0].url, "https://api.pipefy.com/graphql");
    assert(normalizeGql(JSON.parse(seed.m.calls[0].body!).query).startsWith(c.query));

    // "2" is added and "1" is renamed in place: only the added row is emitted.
    const page = [row("1", "A (renamed)"), row("2", "B")];
    const first = await run(seeded.nextState, page).out;
    const retry = await run(seeded.nextState, page).out;
    assertEquals(first.events, [{ change: "added", key: "2", values: row("2", "B") }]);
    assertEquals(retry, first);
  });
}
