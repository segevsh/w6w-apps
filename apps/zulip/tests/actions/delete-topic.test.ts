import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-topic.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("delete-topic: posts the topic name and returns `complete`", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", complete: false } }]);
  const out = await action.execute!({ stream_id: 4, topic_name: "old" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/streams/4/delete_topic");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { topic_name: "old" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { complete: false });
});

Deno.test("delete-topic: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", complete: false } }]);
  await action.execute!({ stream_id: 4, topic_name: "old" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("delete-topic: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ stream_id: 4, topic_name: "old" }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("delete-topic: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ stream_id: 4, topic_name: "old" }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("delete-topic: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ stream_id: 4, topic_name: "old" }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
