import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";
import newQuestion from "../../triggers/new-session-question.ts";
import newRecording from "../../triggers/new-session-recording.ts";
import newUser from "../../triggers/new-user.ts";

// Bounded lists (brief 9.1 c): read whole, compared check to check, only added rows fire.
const cases = [
  {
    name: "new-session-question",
    trigger: newQuestion,
    params: { sessionId: "s1" },
    type: "questions",
    path: "/v1/sessions/s1/questions",
    paged: true,
  },
  {
    name: "new-session-recording",
    trigger: newRecording,
    params: { sessionId: "s1" },
    type: "recordings",
    path: "/v1/sessions/s1/recordings",
    paged: true,
  },
  {
    name: "new-user",
    trigger: newUser,
    params: {},
    type: "users",
    path: "/v1/users",
    paged: false,
  },
];

for (const c of cases) {
  const input = { params: c.params, subscriptionId: "sub-1" };
  const rows = (ids: string[]) => ({
    body: list(ids.map((id) => resource(c.type, id, { n: id }))),
  });

  test(`${c.name}: seed emits nothing, a new row fires once, an edit does not`, async () => {
    const seeded = await c.trigger.poll!({ ...input, state: {} }, mockCtx([rows(["a", "b"])]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const go = () =>
      c.trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([rows(["a", "b", "c"])]).ctx);
    const first = await go();
    assertEquals(first.events, [resource(c.type, "c", { n: "c" })]);
    assertEquals(await go(), first);
    const edited = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{
        body: list([resource(c.type, "a", { n: "changed" }), resource(c.type, "b", { n: "b" })]),
      }])
        .ctx,
    );
    assertEquals(edited.events, []);
  });

  test(`${c.name}: reads the list with a literal GET`, async () => {
    const m = mockCtx([rows(["a"])]);
    await c.trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(pathOf(m.calls[0].url), c.path);
    assertEquals(
      queryOf(m.calls[0].url),
      c.paged ? { "page[number]": "0", "page[size]": "100" } : {},
    );
  });
}

test("new-session-question: a full page is followed by the next page, and an endless list is refused", async () => {
  const ids = Array.from({ length: 100 }, (_, i) => `q${i}`);
  const full = () => ({ body: list(ids.map((id) => resource("questions", id))) });
  const input = { params: { sessionId: "s1" }, subscriptionId: "sub-1" };
  const m = mockCtx([full(), { body: list([resource("questions", "last")]) }]);
  const r = await newQuestion.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(r.events, []);
  assertEquals(m.calls.map((c) => queryOf(c.url)["page[number]"]), ["0", "1"]);
  const endless = mockCtx(Array.from({ length: 50 }, full));
  await assertRejects(
    () => newQuestion.poll!({ ...input, state: {} }, endless.ctx),
    Error,
    "cannot compare",
  );
});

test("new-session-question: a missing session id is refused before any request", async () => {
  const m = mockCtx();
  await assertRejects(
    () => newQuestion.poll!({ params: {}, subscriptionId: "s", state: {} }, m.ctx),
    Error,
    "Session ID",
  );
  assertEquals(m.calls.length, 0);
});
