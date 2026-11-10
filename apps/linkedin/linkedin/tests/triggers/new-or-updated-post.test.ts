import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-post.ts";

const input = { params: { authorType: "person", authorId: "123" }, subscriptionId: "sub-1" };
const item = (id: string, stamp = "1") => ({ id, lastModifiedAt: stamp });
const response = (items: unknown[]) => ({ elements: items, paging: {} });
const request = (c: { method: string; url: string }) => ({ method: c.method, url: c.url });

const run = async (state: unknown, items: unknown[]) => {
  const mock = mockCtx([{ body: response(items) }]);
  const result = await trigger.poll!({ ...input, state }, mock.ctx);
  return { result, calls: mock.calls };
};

test("new-or-updated-post: the first check seeds the feed without emitting", async () => {
  const { result } = await run({}, [item("a")]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-post: a new record and an edited record are each emitted once, and a retry repeats them identically", async () => {
  const seeded = (await run({}, [item("a", "1")])).result.nextState;
  const page = [item("b", "1"), item("a", "2")];
  const first = await run(seeded, page);
  const retry = await run(seeded, page);
  assertEquals(first.result.events, [item("a", "2"), item("b", "1")]);
  assertEquals(retry.result, first.result);
});

test("new-or-updated-post: an unchanged record is not emitted again", async () => {
  const seeded = (await run({}, [item("a", "1")])).result.nextState;
  const next = await run(seeded, [item("a", "1")]);
  assertEquals(next.result.events, []);
});

test("new-or-updated-post: requests exactly the endpoint and by last-modified time descending (`sortBy=LAST_MODIFIED`) that `list-posts-by-author` calls", async () => {
  const { calls } = await run({}, [item("a")]);
  assertEquals(calls.length, 1);
  assertEquals(request(calls[0]), {
    method: "GET",
    url:
      "https://api.linkedin.com/rest/posts?q=author&author=urn%3Ali%3Aperson%3A123&count=100&start=0&sortBy=LAST_MODIFIED",
  });
});
