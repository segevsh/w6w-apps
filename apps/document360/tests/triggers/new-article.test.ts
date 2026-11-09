import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import nodeAssert from "node:assert/strict";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-article.ts";
import updated from "../../triggers/new-or-updated-article.ts";

const input = { params: { workspaceId: "w1" }, subscriptionId: "sub-1" };
const art = (id: string, hash = "h1") => ({ id, title: `t ${id}`, hash });
const ctx = (items: unknown[], more = false) =>
  mockCtx([{ body: listEnvelope(items, { has_more: more }) }]);
const URL_ =
  "https://apihub.document360.io/v3/projects/11111111-2222-3333-4444-555555555555/workspaces/w1/articles?page=1&page_size=100";

test("new-article: seeds without flooding and requests the workspace articles", async () => {
  const seed = ctx([art("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, URL_);
});

test("new-article: emits only the article that was added, not an edited one", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([art("a")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([art("a", "h2"), art("b")]).ctx,
  );
  assertEquals(result.events, [art("b")]);
});

test("new-article: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([art("a")]).ctx);
  const page = [art("a"), art("b")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-article: follows has_more across pages", async () => {
  const m = mockCtx([
    { body: listEnvelope([art("a")], { has_more: true }) },
    { body: listEnvelope([art("b")], { has_more: false }) },
  ]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 2);
  assertEquals(m.calls[1].url, URL_.replace("page=1", "page=2"));
});

test("new-article: a workspace beyond the cap is refused, not truncated", async () => {
  const m = mockCtx(Array.from({ length: 10 }, () => ({
    body: listEnvelope([art("a")], { has_more: true }),
  })));
  await nodeAssert.rejects(
    () => trigger.poll!({ ...input, state: {} }, m.ctx) as Promise<unknown>,
    /at most 1000/,
  );
});

test("new-or-updated-article: an edited article is an event", async () => {
  const seeded = await updated.poll!({ ...input, state: {} }, ctx([art("a")]).ctx);
  const result = await updated.poll!(
    { ...input, state: seeded.nextState },
    ctx([art("a", "h2")]).ctx,
  );
  assertEquals(result.events, [art("a", "h2")]);
  const quiet = await updated.poll!({ ...input, state: seeded.nextState }, ctx([art("a")]).ctx);
  assertEquals(quiet.events, []);
});
