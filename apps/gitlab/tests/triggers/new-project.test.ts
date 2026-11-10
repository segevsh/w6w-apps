import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const project = (id: number) => ({ id, path_with_namespace: `acme/p${id}` });
const ctx = (...pages: unknown[][]) => mockCtx(pages.map((body) => ({ body })));

test("new-project seeds, emits, retries, and requests the newest page of my projects", async () => {
  const seed = ctx([project(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://gitlab.com/api/v4/projects?membership=true&per_page=100",
  );
  const page = [project(2), project(1)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [project(2)]);
  assertEquals(retry, first);
});

test("new-project reads one page even when every item on it is new", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([project(1)]).ctx);
  const m = ctx([project(3), project(2)], [project(9)]);
  const got = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(got.events, [project(2), project(3)]);
  assertEquals(m.calls.length, 1);
});

test("new-project declares output and a sample, and is a poll trigger", () => {
  assertEquals((trigger.output?.length ?? 0) > 0, true);
  assertEquals(trigger.sample !== undefined, true);
  assertEquals(typeof trigger.poll, "function");
});
