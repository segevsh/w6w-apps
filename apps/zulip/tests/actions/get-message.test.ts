import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-message.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("get-message: fetches one message by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", raw_content: "hi", message: { id: 5 } },
  }]);
  const out = await action.execute!({ message_id: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages/5");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { apply_markdown: "false" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { raw_content: "hi", message: { id: 5 } });
});

Deno.test("get-message: apply_markdown=true is forwarded", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", raw_content: "hi", message: { id: 5 } },
  }]);
  const out = await action.execute!({ message_id: 5, apply_markdown: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages/5");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { apply_markdown: "true" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { raw_content: "hi", message: { id: 5 } });
});

Deno.test("get-message: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", raw_content: "hi", message: { id: 5 } },
  }]);
  await action.execute!({ message_id: 5 }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("get-message: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ message_id: 5 }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("get-message: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ message_id: 5 }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("get-message: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ message_id: 5 }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
