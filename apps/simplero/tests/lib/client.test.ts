import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  errorMessage,
  SimpleroClient,
  truncate,
  USER_AGENT,
} from "../../lib/client.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("buildQuery: flattens deepObject filters into bracketed keys", () => {
  const q = buildQuery({ email: { op: "equals", value: "a@b.co" }, page: 2 });
  assertEquals(q.get("email[op]"), "equals");
  assertEquals(q.get("email[value]"), "a@b.co");
  assertEquals(q.get("page"), "2");
});

Deno.test("buildQuery: drops undefined, null and empty values, keeps false and 0", () => {
  const q = buildQuery({ a: undefined, b: null, c: "", d: false, e: 0, f: { g: undefined } });
  assertEquals([...q.keys()].sort(), ["d", "e"]);
  assertEquals(q.get("d"), "false");
});

Deno.test("errorMessage: reads the singular `error` string (401) and the `errors` array (422)", () => {
  assert(
    errorMessage(401, "GET", "/api/v2/lists", "application/json", '{"error":"Bad API key"}')
      .endsWith("Bad API key"),
  );
  assert(
    errorMessage(422, "POST", "/api/v2/tags", "application/json", '{"errors":["a","b"]}')
      .endsWith("a; b"),
  );
});

Deno.test("errorMessage: summarises an HTML body instead of pasting it", () => {
  const html = "<html>" + "x".repeat(5000) + "</html>";
  const msg = errorMessage(404, "GET", "/api/v2/nope", "text/html; charset=utf-8", html);
  assert(msg.includes("HTML page"), msg);
  assert(msg.length < 300, `message is ${msg.length} chars`);
});

Deno.test("errorMessage: falls back to a truncated raw body for unknown JSON or text", () => {
  assert(errorMessage(500, "GET", "/p", "text/plain", "boom").endsWith("boom"));
  assert(errorMessage(409, "POST", "/p", "application/json", '{"x":1}').endsWith('{"x":1}'));
  assertEquals(errorMessage(502, "GET", "/p", "", ""), "Simplero 502 for GET /p");
});

Deno.test("truncate: leaves short text alone and marks long text", () => {
  assertEquals(truncate("abc", 10), "abc");
  assert(truncate("x".repeat(50), 10).includes("(50 bytes)"));
});

Deno.test("SimpleroClient: sends accept + user-agent, builds the /api/v2 URL, never sets credentials", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }]);
  await new SimpleroClient(ctx).list("/tags", { q: "vip" });
  assertEquals(pathOf(calls[0].url), "/api/v2/tags");
  assertEquals(new URL(calls[0].url).origin, "https://simplero.com");
  assertEquals(queryOf(calls[0].url), { q: "vip" });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
});

Deno.test("SimpleroClient: a 200 that is not JSON (an SPA shell) is rejected", async () => {
  const { ctx } = mockCtx([
    { headers: { "content-type": "text/html" }, body: "<!doctype html><html></html>" },
  ]);
  await assertRejects(
    async () => await new SimpleroClient(ctx).get("/lists"),
    Error,
    "expected JSON",
  );
});

Deno.test("SimpleroClient.list: page paging derives hasMore from page < total_pages", async () => {
  const { ctx } = mockCtx([
    { body: listBody([{ id: 1 }], { page: 2, per_page: 1, total: 3, total_pages: 3 }) },
    { body: listBody([{ id: 3 }], { page: 3, per_page: 1, total: 3, total_pages: 3 }) },
  ]);
  const c = new SimpleroClient(ctx);
  assertEquals((await c.list("/tags")).hasMore, true);
  assertEquals((await c.list("/tags")).hasMore, false);
});

Deno.test("SimpleroClient.list: an empty cursor page has no more", async () => {
  const { ctx } = mockCtx([
    {
      body: listBody([], {
        page: null,
        per_page: 20,
        total: null,
        total_pages: null,
        next_after: null,
      }),
    },
  ]);
  const out = await new SimpleroClient(ctx).list("/tags", { after: 9999 });
  assertEquals(out.hasMore, false);
  assertEquals(out.nextAfter, null);
});

Deno.test("SimpleroClient.callAction: returns success and message", async () => {
  const { ctx } = mockCtx([{ body: { data: { success: true } } }]);
  assertEquals(await new SimpleroClient(ctx).callAction("/customers/1/actions/add_tag", {}), {
    success: true,
    message: null,
  });
});
