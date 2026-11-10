import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-posting.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const posting = (id: string) => ({ id, text: `Role ${id}`, state: "published" });
const page = (postings: unknown[], next?: string) => ({
  data: postings,
  hasNext: next !== undefined,
  ...(next === undefined ? {} : { next }),
});

const run = async (state: unknown, responses: unknown[][]) => {
  const mock = mockCtx(responses.map((body, i) => ({
    body: page(body, i < responses.length - 1 ? `cursor-${i + 1}` : undefined),
  })));
  const result = await trigger.poll!({ ...input, state }, mock.ctx);
  return { result, calls: mock.calls };
};

test("new-posting: the first check seeds the collection without emitting", async () => {
  const { result } = await run({}, [[posting("a")]]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-posting: a posting added after seeding is emitted once, and a retry repeats it identically", async () => {
  const seeded = (await run({}, [[posting("a")]])).result.nextState;
  const first = await run(seeded, [[posting("a"), posting("b")]]);
  const retry = await run(seeded, [[posting("a"), posting("b")]]);
  assertEquals(first.result.events, [posting("b")]);
  assertEquals(retry.result, first.result);
});

test("new-posting: an edited posting is not emitted", async () => {
  const seeded = (await run({}, [[posting("a")]])).result.nextState;
  const edited = await run(seeded, [[{ ...posting("a"), text: "Renamed" }]]);
  assertEquals(edited.result.events, []);
});

test("new-posting: a posting on the second page is found, and each page is requested with its cursor", async () => {
  const seeded = (await run({}, [[posting("a")], [posting("b")]])).result.nextState;
  const next = await run(seeded, [[posting("a")], [posting("b"), posting("c")]]);
  assertEquals(next.result.events, [posting("c")]);
  assertEquals(
    next.calls.map((c) => ({ method: c.method, url: c.url })),
    [
      { method: "GET", url: "https://api.lever.co/v1/postings?confidentiality=all&limit=100" },
      {
        method: "GET",
        url: "https://api.lever.co/v1/postings?confidentiality=all&limit=100&offset=cursor-1",
      },
    ],
  );
});
