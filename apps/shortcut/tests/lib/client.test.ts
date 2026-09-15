import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  asOptionalJson,
  compact,
  formatShortcutError,
  ShortcutClient,
  toIntList,
  toStringList,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: one host, one prefix", () => {
  assertEquals(API_BASE, "https://api.app.shortcut.com");
  assertEquals(API_PREFIX, "/api/v3");
});

Deno.test("compact: drops undefined, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: false, c: 0, d: "x" }), { b: false, c: 0, d: "x" });
});

Deno.test("toIntList: accepts an array or a comma-separated string", () => {
  assertEquals(toIntList([1, 2]), [1, 2]);
  assertEquals(toIntList("1, 2 ,3"), [1, 2, 3]);
  assertEquals(toIntList(undefined), undefined);
  assertEquals(toIntList(""), undefined);
});

Deno.test("toStringList: accepts an array or a comma-separated string", () => {
  assertEquals(toStringList(["a", "b"]), ["a", "b"]);
  assertEquals(toStringList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toStringList(undefined), undefined);
});

Deno.test("asOptionalJson: parses a string, passes through a value, rejects bad JSON", () => {
  assertEquals(asOptionalJson('{"a":1}', "field"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "field"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "field"), undefined);
  assertEquals(asOptionalJson("", "field"), undefined);
  let threw = false;
  try {
    asOptionalJson("{not json", "field");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("field"));
  }
  assert(threw);
});

Deno.test("formatShortcutError: surfaces both message and tag", () => {
  const msg = formatShortcutError(
    401,
    "GET",
    "/api/v3/member",
    JSON.stringify({ message: "Unauthorized", tag: "unauthorized" }),
  );
  assert(msg.includes("unauthorized"), msg);
  assert(msg.includes("Unauthorized"), msg);
  assert(msg.includes("401"), msg);
});

Deno.test("formatShortcutError: a 429 adds the rate-limit hint", () => {
  const msg = formatShortcutError(
    429,
    "POST",
    "/api/v3/stories",
    JSON.stringify({ message: "rate limited", tag: "rate-limited" }),
  );
  assert(/200 requests\/minute/.test(msg), msg);
});

Deno.test("formatShortcutError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatShortcutError(500, "GET", "/api/v3/member", "<html>gateway error</html>");
  assert(msg.includes("<html>gateway error</html>"), msg);
});

Deno.test("ShortcutClient.get: builds the full URL and parses JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "foo" } }]);
  const out = await new ShortcutClient(ctx).get<{ id: number }>("/member");

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.app.shortcut.com/api/v3/member");
  assertEquals(out.id, 1);
});

Deno.test("ShortcutClient.get: drops empty query values and joins arrays with commas", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new ShortcutClient(ctx).get("/labels", { slim: true, name: "", ids: [1, 2, 3] });

  assertEquals(queryOf(calls[0].url), { slim: "true", ids: "1,2,3" });
});

Deno.test("ShortcutClient.post: sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await new ShortcutClient(ctx).post("/stories", { name: "a story" });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "a story" });
});

Deno.test("ShortcutClient.delete: returns the status, tolerating a 204 with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const status = await new ShortcutClient(ctx).delete("/stories/1");

  assertEquals(status, 204);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/stories/1");
});

Deno.test("ShortcutClient: a non-ok response throws with the Shortcut error shape", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("unauthorized", "Unauthorized") }]);
  const err = await assertRejects(() => new ShortcutClient(ctx).get("/member"), Error);
  assert(err.message.includes("unauthorized"), err.message);
});

Deno.test("ShortcutClient.get: an empty body (e.g. 204) resolves to undefined, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new ShortcutClient(ctx).get("/member");
  assertEquals(out, undefined);
});
