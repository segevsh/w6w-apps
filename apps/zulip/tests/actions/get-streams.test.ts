import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-streams.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("get-streams: no filters sends no query", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", streams: [{ stream_id: 1, name: "general" }] },
  }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/streams");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { streams: [{ stream_id: 1, name: "general" }] });
});

Deno.test("get-streams: filters are sent as query booleans", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", streams: [] } }]);
  const out = await action.execute!({
    include_public: false,
    include_all_active: true,
    exclude_archived: false,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/streams");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    include_public: "false",
    include_all_active: "true",
    exclude_archived: "false",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { streams: [] });
});

Deno.test("get-streams: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", streams: [{ stream_id: 1, name: "general" }] },
  }]);
  await action.execute!({}, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("get-streams: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("get-streams: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("get-streams: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
