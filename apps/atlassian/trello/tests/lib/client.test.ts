import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { compact, TrelloClient, unset } from "../../lib/client.ts";

test("client: builds the v1 URL and sets no Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await new TrelloClient(ctx).request("/cards/c1");
  assertEquals(calls[0].url, "https://api.trello.com/1/cards/c1");
  // Trello's key/token go in the query string, appended by `sign` — not here.
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(new URL(calls[0].url).searchParams.has("key"), false);
});

test("client: skips unset query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TrelloClient(ctx).request("/cards", {
    query: { a: "kept", b: undefined, c: null, d: "", e: false },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("a"), "kept");
  assertEquals(q.get("e"), "false");
  for (const k of ["b", "c", "d"]) assertEquals(q.has(k), false);
});

test("client: surfaces Trello's plain-text error body", async () => {
  const { ctx } = mockCtx([{ status: 400, statusText: "Bad Request", body: "invalid id" }]);
  await assertRejects(
    () => new TrelloClient(ctx).request("/cards/nope"),
    Error,
    "Trello 400 Bad Request for GET /1/cards/nope: invalid id",
  );
});

test("client: tolerates an empty body (Trello's DELETE responses)", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new TrelloClient(ctx).request("/cards/c1", { method: "DELETE" }), undefined);
});

test("client: compact keeps falsy values but drops unset ones", () => {
  assertEquals(compact({ a: 0, b: false, c: "", d: undefined, e: null }), {
    a: 0,
    b: false,
    c: "",
  });
});

test("client: unset maps a blank form field to absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
