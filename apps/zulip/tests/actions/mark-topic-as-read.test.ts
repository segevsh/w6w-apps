import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/mark-topic-as-read.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("mark-topic-as-read: posts channel id and topic", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  const out = await action.execute!({ stream_id: 6, topic_name: "plans" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/mark_topic_as_read");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { stream_id: "6", topic_name: "plans" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, {});
});

Deno.test("mark-topic-as-read: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  await action.execute!({ stream_id: 6, topic_name: "plans" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("mark-topic-as-read: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ stream_id: 6, topic_name: "plans" }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("mark-topic-as-read: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ stream_id: 6, topic_name: "plans" }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("mark-topic-as-read: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ stream_id: 6, topic_name: "plans" }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
