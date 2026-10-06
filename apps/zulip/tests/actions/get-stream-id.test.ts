import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-stream-id.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("get-stream-id: sends the name as `stream`", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", stream_id: 11 } }]);
  const out = await action.execute!({ stream: "general" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/get_stream_id");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { stream: "general" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { stream_id: 11 });
});

Deno.test("get-stream-id: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", stream_id: 11 } }]);
  await action.execute!({ stream: "general" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("get-stream-id: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ stream: "general" }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("get-stream-id: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ stream: "general" }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("get-stream-id: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ stream: "general" }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
