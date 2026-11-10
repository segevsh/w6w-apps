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
      data: {
        organization: {
          tables: {
            edges: rows.map((node) => ({ node })),
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    }),
    query:
      "{ organization(id: 12345) { tables(first: 50) { edges { node { id name internal_id } } pageInfo { hasNextPage endCursor } } } }",
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

// `new-table` pages the `tables` connection (vendor: default and maximum page 50; first/after/pageInfo).
const tablesPage = (ids: string[], endCursor: string | null, hasNextPage: boolean) => ({
  body: {
    data: {
      organization: {
        tables: {
          edges: ids.map((id) => ({ node: { id, name: `T${id}` } })),
          pageInfo: { hasNextPage, endCursor },
        },
      },
    },
  },
});
const sentQuery = (m: { calls: Array<{ body: string | null }> }, i: number) =>
  normalizeGql(JSON.parse(m.calls[i].body!).query);

test("new-table: walks every page by cursor (first 50, after endCursor) and snapshots them all", async () => {
  const seedCtx = mockCtx([
    tablesPage(["1", "2"], "CUR1", true),
    tablesPage(["3"], "CUR2", true),
    tablesPage(["4"], null, false),
  ]);
  const seeded = await newTable.poll!(
    { params: { organizationId: "12345" }, subscriptionId: "sub-1", state: {} },
    seedCtx.ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seedCtx.calls.length, 3);
  const head = "{ organization(id: 12345) { tables(";
  const tail =
    ") { edges { node { id name internal_id } } pageInfo { hasNextPage endCursor } } } }";
  assertEquals(sentQuery(seedCtx, 0), `${head}first: 50${tail}`);
  assertEquals(sentQuery(seedCtx, 1), `${head}first: 50, after: "CUR1"${tail}`);
  assertEquals(sentQuery(seedCtx, 2), `${head}first: 50, after: "CUR2"${tail}`);

  // A table on page 3 (4) was seeded, so it is not reported; a new one on the LAST page is.
  const next = mockCtx([
    tablesPage(["1", "2"], "CUR1", true),
    tablesPage(["3"], "CUR2", true),
    tablesPage(["4", "5"], null, false),
  ]);
  const out = await newTable.poll!(
    { params: { organizationId: "12345" }, subscriptionId: "sub-1", state: seeded.nextState },
    next.ctx,
  );
  assertEquals(out.events.map((e: { key: string }) => e.key), ["5"]);
});

test("new-table: fails naming the cap instead of dropping tables beyond 20 pages", async () => {
  const responses = Array.from(
    { length: 20 },
    (_, i) => tablesPage([`t${i}`], `CUR${i}`, true),
  );
  const m = mockCtx(responses);
  let message = "";
  try {
    await newTable.poll!(
      { params: { organizationId: "12345" }, subscriptionId: "sub-1", state: {} },
      m.ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("more than 1000 database tables"), message);
  assertEquals(m.calls.length, 20);
});

test("new-table: a page that reports more but gives no new cursor fails instead of looping", async () => {
  const m = mockCtx([tablesPage(["1"], "CUR1", true), tablesPage(["2"], "CUR1", true)]);
  let message = "";
  try {
    await newTable.poll!(
      { params: { organizationId: "12345" }, subscriptionId: "sub-1", state: {} },
      m.ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("no new cursor"), message);
});
