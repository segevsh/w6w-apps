import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-message.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("delete-message: deletes one message", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  const out = await action.execute!({ message_id: 3 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages/3");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, {});
});

Deno.test("delete-message: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  await action.execute!({ message_id: 3 }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("delete-message: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ message_id: 3 }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("delete-message: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ message_id: 3 }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("delete-message: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ message_id: 3 }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
