import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-question.ts";

const oldQuestion = {
  name: "locations/1/questions/old",
  text: "Old question",
  createTime: "2026-11-09T09:00:00Z",
  updateTime: "2026-11-09T10:00:00Z",
};
const newQuestion = {
  name: "locations/1/questions/new",
  text: "New question",
  createTime: "2026-11-09T11:00:00Z",
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

const q = (n: number, createTime: string) => ({
  name: `locations/1/questions/q${n}`,
  text: `Q${n}`,
  createTime,
  updateTime: "2026-11-09T12:00:00Z",
});

test("new-question: an older unseen question that was updated is not new; a created one is", async () => {
  const seedPage = Array.from(
    { length: 10 },
    (_, i) => q(20 - i, `2026-11-09T10:${String(50 - i).padStart(2, "0")}:00Z`),
  );
  const seeded = await poll({}, mockCtx([{ body: { questions: seedPage } }]).ctx);
  assertEquals(seeded.events, []);

  const q5 = q(5, "2026-11-01T08:00:00Z");
  const updated = await poll(
    seeded.nextState,
    mockCtx([{ body: { questions: [q5, ...seedPage.slice(0, 9)] } }]).ctx,
  );
  assertEquals(updated.events, []);

  const q21 = q(21, "2026-11-09T11:00:00Z");
  const created = await poll(
    updated.nextState,
    mockCtx([{ body: { questions: [q21, q5, ...seedPage.slice(0, 8)] } }]).ctx,
  );
  assertEquals(created.events, [q21]);
});
