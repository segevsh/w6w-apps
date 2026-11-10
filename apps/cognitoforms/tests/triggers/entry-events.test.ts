import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import submitted from "../../triggers/entry-submitted.ts";
import updated from "../../triggers/entry-updated.ts";
import deleted from "../../triggers/entry-deleted.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const ENTRY = {
  Id: "7-42",
  Form: { Id: "7", Name: "Contact Us" },
  Entry: { Id: "7-42", Number: 42 },
  Name: { First: "Ada", Last: "Lovelace" },
  Email: "ada@example.test",
};

const call = (body: unknown, method = "POST") => ({
  raw: {
    method,
    path: "/",
    query: {},
    headers: { "content-type": "application/json" } as Record<string, string>,
    body,
    rawBody: JSON.stringify(body),
  },
  params: {},
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = async (t: typeof submitted, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("app declares the three webhook triggers with output and sample and no params", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "entry-submitted",
    "entry-updated",
    "entry-deleted",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params, []);
  }
});

test("a posted entry is parsed into one event per trigger", async () => {
  const cases: Array<[typeof submitted, string]> = [
    [submitted, "entry.submitted"],
    [updated, "entry.updated"],
    [deleted, "entry.deleted"],
  ];
  for (const [t, event] of cases) {
    const out = evs(await ingest(t, call(ENTRY))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].event, event);
    assertEquals(out[0].entryId, "7-42");
    assertEquals(out[0].formId, "7");
    assertEquals((out[0].entry as Record<string, unknown>).Email, "ada@example.test");
  }
});

test("an entry without the usual id fields still delivers, with null ids", async () => {
  const out = evs(await ingest(submitted, call({ Email: "a@b.test" }))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out[0].entryId, null);
  assertEquals(out[0].formId, null);
  assertEquals((out[0].entry as Record<string, unknown>).Email, "a@b.test");
});

test("a body that is not a JSON object is refused", async () => {
  await assertRejects(() => ingest(submitted, call([1, 2])), Error, "JSON object");
  await assertRejects(() => ingest(submitted, call("text")), Error, "JSON object");
  await assertRejects(() => ingest(submitted, call(null)), Error, "JSON object");
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(submitted, call(ENTRY, "GET")), Error, "POST");
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await submitted.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await submitted.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
