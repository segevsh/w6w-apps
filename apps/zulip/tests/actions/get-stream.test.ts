import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-stream.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("get-stream: fetches one channel", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", stream: { stream_id: 4 } },
  }]);
  const out = await action.execute!({ stream_id: 4 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/streams/4");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { stream: { stream_id: 4 } });
});

Deno.test("get-stream: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", stream: { stream_id: 4 } },
  }]);
  await action.execute!({ stream_id: 4 }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("get-stream: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ stream_id: 4 }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("get-stream: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ stream_id: 4 }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("get-stream: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ stream_id: 4 }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
