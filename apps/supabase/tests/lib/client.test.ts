import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockSupabaseCtx } from "../_helpers.ts";
import {
  compact,
  parseJsonParam,
  projectUrlFromConnection,
  restUrl,
  SupabaseClient,
  unset,
} from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's projectUrl, not a param", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: [] }], "https://acme.supabase.co");
  await new SupabaseClient(ctx).request("/todos");
  assertEquals(calls[0].url, "https://acme.supabase.co/rest/v1/todos");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no projectUrl", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new SupabaseClient(ctx), Error, "no projectUrl");
});

Deno.test("client: surfaces PostgREST's error body", async () => {
  const { ctx } = mockSupabaseCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"message":"column \\"nope\\" does not exist"}',
  }]);
  await assertRejects(
    () => new SupabaseClient(ctx).request("/todos"),
    Error,
    'column \\"nope\\" does not exist',
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockSupabaseCtx([{ status: 204 }]);
  assertEquals(await new SupabaseClient(ctx).request("/todos", { method: "DELETE" }), undefined);
});

Deno.test("client: merges caller headers over the accept default", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ body: {} }]);
  await new SupabaseClient(ctx).request("/todos", {
    headers: { accept: "application/vnd.pgrst.object+json" },
  });
  assertEquals(calls[0].headers["accept"], "application/vnd.pgrst.object+json");
});

Deno.test("client.count: parses a numeric Content-Range total", async () => {
  const { ctx, calls } = mockSupabaseCtx([{ headers: { "content-range": "0-9/123" } }]);
  const out = await new SupabaseClient(ctx).count("/todos");
  assertEquals(calls[0].method, "HEAD");
  assertEquals(calls[0].headers["prefer"], "count=exact");
  assertEquals(out.count, 123);
});

Deno.test("projectUrlFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    projectUrlFromConnection({ display: { projectUrl: "https://acme.supabase.co" } } as never),
    "https://acme.supabase.co",
  );
  assertThrows(() => projectUrlFromConnection(undefined), Error, "no projectUrl");
});

Deno.test("restUrl: builds the per-project REST root, trimming a trailing slash", () => {
  assertEquals(restUrl("https://acme.supabase.co"), "https://acme.supabase.co/rest/v1");
  assertEquals(restUrl("https://acme.supabase.co/"), "https://acme.supabase.co/rest/v1");
});

Deno.test("parseJsonParam: accepts a decoded object/array or a raw JSON string", () => {
  assertEquals(parseJsonParam({ a: 1 }), { a: 1 });
  assertEquals(parseJsonParam('{"a":1}'), { a: 1 });
  assertEquals(parseJsonParam(""), undefined);
  assertEquals(parseJsonParam(undefined), undefined);
});

Deno.test("compact/unset drop blank and nullish values", () => {
  assertEquals(compact({ a: 0, b: undefined, c: null, d: "" }), { a: 0 });
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
