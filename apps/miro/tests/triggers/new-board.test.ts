import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-board.ts";
const item = (id: string) => ({ id });
const ctx = (items: unknown[]) =>
  mockCtx([{ body: { data: items, total: items.length, size: items.length } }], { display: {} });
const input = { params: { teamId: "team1" }, state: {}, subscriptionId: "sub" };
test("new-board seeds, emits boards, retries, and requests last-created order within the team", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.miro.com/v2/boards?team_id=team1&sort=last_created&limit=50&offset=0",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
test("new-board passes the optional project id", async () => {
  const run = ctx([item("a")]);
  await trigger.poll!({ ...input, params: { teamId: "team1", projectId: "p9" } }, run.ctx);
  assertEquals(
    run.calls[0].url,
    "https://api.miro.com/v2/boards?team_id=team1&project_id=p9&sort=last_created&limit=50&offset=0",
  );
});
test("new-board refuses to run without a team id", async () => {
  await assertRejects(() => trigger.poll!({ ...input, params: {} }, ctx([]).ctx));
});
