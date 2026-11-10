import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import created from "../../triggers/new-work-item.ts";
import updated from "../../triggers/new-or-updated-work-item.ts";

const item = (id: number, changed = "2026-11-09T10:00:00Z") => ({
  id,
  fields: { "System.ChangedDate": changed },
});
const responses = (...items: ReturnType<typeof item>[]) => [
  { body: { workItems: items.map(({ id }) => ({ id })) } },
  { body: { value: items } },
];
const EMPTY = { v: 1, kind: "ids", seeded: true, ids: [] };

for (
  const [name, trigger, order] of [
    ["new-work-item", created, "System.CreatedDate"],
    ["new-or-updated-work-item", updated, "System.ChangedDate"],
  ] as const
) {
  const poll = (state: unknown, ...items: ReturnType<typeof item>[]) => {
    const result = mockCtx(responses(...items), { display: { organization: "org" } });
    return {
      result,
      out: trigger.poll!({ params: { project: "P" }, state, subscriptionId: "sub" }, result.ctx),
    };
  };

  test(`${name} 1 first check seeds without emitting`, async () => {
    const value = await poll({}, item(1)).out;
    assertEquals(value.events, []);
    assertEquals((value.nextState as { seeded: boolean }).seeded, true);
  });

  test(`${name} 2 a new work item is emitted`, async () => {
    const seed = await poll({}, item(1)).out;
    const value = await poll(seed.nextState, item(2), item(1)).out;
    assertEquals(value.events.map((e) => (e as { id: number }).id), [2]);
  });

  test(`${name} 3 repeated check is idempotent`, async () => {
    const seed = await poll({}, item(1)).out;
    const run = () => poll(seed.nextState, item(2), item(1)).out;
    assertEquals(await run(), await run());
  });

  test(`${name} 4 posts the literal WIQL with an explicit ORDER BY`, async () => {
    const { result, out } = poll(EMPTY, item(2));
    await out;
    const [query, batch] = result.calls;
    assertEquals(query.method, "POST");
    assertEquals(new URL(query.url).pathname, "/org/P/_apis/wit/wiql");
    assertEquals(new URL(query.url).searchParams.get("$top"), "100");
    assertEquals(
      JSON.parse(query.body!).query,
      "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project " +
        `ORDER BY [${order}] DESC`,
    );
    assertEquals(new URL(batch.url).pathname, "/org/P/_apis/wit/workitemsbatch");
    assertEquals(JSON.parse(batch.body!).ids, [2]);
  });
}

test("new-or-updated-work-item emits an edited item again", async () => {
  const run = (state: unknown, ...items: ReturnType<typeof item>[]) =>
    updated.poll!(
      { params: { project: "P" }, state, subscriptionId: "s" },
      mockCtx(responses(...items), { display: { organization: "org" } }).ctx,
    );
  const seed = await run({}, item(1, "t1"));
  const value = await run(seed.nextState, item(1, "t2"));
  assertEquals(value.events.length, 1);
});

test("new-work-item does not re-emit an edited item", async () => {
  const run = (state: unknown, ...items: ReturnType<typeof item>[]) =>
    created.poll!(
      { params: { project: "P" }, state, subscriptionId: "s" },
      mockCtx(responses(...items), { display: { organization: "org" } }).ctx,
    );
  const seed = await run({}, item(1, "t1"));
  const value = await run(seed.nextState, item(1, "t2"));
  assertEquals(value.events, []);
});
