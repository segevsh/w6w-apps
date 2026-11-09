import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-question.ts";

const oldQuestion = {
  name: "locations/1/questions/old",
  text: "Old question",
  updateTime: "2026-11-09T10:00:00Z",
};
const newQuestion = {
  name: "locations/1/questions/new",
  text: "New question",
  updateTime: "2026-11-09T11:00:00Z",
};
const poll = (state: unknown, ctx: ReturnType<typeof mockCtx>["ctx"]) =>
  trigger.poll!({ params: { locationId: "1" }, state, subscriptionId: "sub_business" }, ctx);

test("new-question: seeds the cursor without emitting existing questions", async () => {
  const result = await poll({}, mockCtx([{ body: { questions: [oldQuestion] } }]).ctx);
  assertEquals(result.events, []);
  assertEquals(result.nextState?.seeded, true);
});

test("new-question: emits exactly one newly listed question", async () => {
  const seeded = await poll({}, mockCtx([{ body: { questions: [oldQuestion] } }]).ctx);
  const result = await poll(
    seeded.nextState,
    mockCtx([{ body: { questions: [newQuestion, oldQuestion] } }]).ctx,
  );
  assertEquals(result.events, [newQuestion]);
});

test("new-question: retries with the same state and response identically", async () => {
  const seeded = await poll({}, mockCtx([{ body: { questions: [oldQuestion] } }]).ctx);
  const first = await poll(
    seeded.nextState,
    mockCtx([{ body: { questions: [newQuestion, oldQuestion] } }]).ctx,
  );
  const second = await poll(
    seeded.nextState,
    mockCtx([{ body: { questions: [newQuestion, oldQuestion] } }]).ctx,
  );
  assertEquals(first, second);
});

test("new-question: uses the literal newest-first locations.questions.list request", async () => {
  const { ctx, calls } = mockCtx([{ body: { questions: [] } }]);
  await poll({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    { method: calls[0].method, path: url.pathname, query: Object.fromEntries(url.searchParams) },
    {
      method: "GET",
      path: "/v1/locations/1/questions",
      query: {
        answersPerQuestion: "10",
        orderBy: "updateTime desc",
        pageSize: "10",
      },
    },
  );
});
