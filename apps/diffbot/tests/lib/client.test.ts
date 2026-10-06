import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  DiffbotClient,
  errorText,
  formatError,
  splitList,
  truncate,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("errorText: reads errors, messages, error and message shapes, else raw text", () => {
  assertEquals(errorText('{"errors":["a","b"]}'), "a; b");
  assertEquals(errorText('{"messages":["m"]}'), "m");
  assertEquals(errorText('{"error":"e"}'), "e");
  assertEquals(errorText('{"message":"x"}'), "x");
  assertEquals(errorText("plain"), "plain");
  assertEquals(errorText("  "), "");
});

Deno.test("formatError: hints on 401/402/429; truncate caps long text", () => {
  assertEquals(formatError(401, "GET", "/p", "{}").includes("token was rejected"), true);
  assertEquals(formatError(429, "GET", "/p", "{}").includes("rate limit"), true);
  assertEquals(formatError(402, "GET", "/p", "{}").includes("credits"), true);
  assertEquals(truncate("x".repeat(700)).includes("truncated"), true);
  assertEquals(truncate("short"), "short");
});

Deno.test("client: repeated query arrays, blanks skipped, JSON and form bodies", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }, { body: {} }]);
  const c = new DiffbotClient(ctx);
  await c.request("/v3/x", { query: { a: ["1", "2"], b: "", c: undefined, d: 0 } });
  assertEquals(new URL(calls[0].url).searchParams.getAll("a"), ["1", "2"]);
  assertEquals(new URL(calls[0].url).searchParams.has("b"), false);
  assertEquals(new URL(calls[0].url).searchParams.get("d"), "0");
  assertEquals(calls[0].method, "GET");
  await c.request("/v3/x", { json: { q: 1 } });
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].headers["content-type"], "application/json");
  await c.request("/v3/x", { form: { a: "1", b: "" } });
  assertEquals(calls[2].body, "a=1");
});

Deno.test("client: a 2xx body carrying errorCode >= 400 throws; text bodies are kept", async () => {
  const bad = mockCtx([{ body: { errorCode: 500, error: "Could not download" } }]);
  await assertRejects(
    () => new DiffbotClient(bad.ctx).request("/v3/x"),
    Error,
    "Could not download",
  );
  const csv = mockCtx([{ body: "a,b\n1,2\n", headers: { "content-type": "text/csv" } }]);
  assertEquals((await new DiffbotClient(csv.ctx).request("/x")).body, "a,b\n1,2\n");
});

Deno.test("compact and splitList", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: 0 }), { a: 1, e: 0 });
  assertEquals(splitList(" a, b ,,c"), ["a", "b", "c"]);
  assertEquals(splitList(undefined), []);
});
