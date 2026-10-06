import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-stream.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("update-stream: renames and describes a channel", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  const out = await action.execute!({
    stream_id: 4,
    new_name: "n",
    description: "d",
    is_private: false,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/streams/4");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { new_name: "n", description: "d", is_private: "false" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, {});
});

Deno.test("update-stream: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  await action.execute!({ stream_id: 4, new_name: "n", description: "d", is_private: false }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("update-stream: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { stream_id: 4, new_name: "n", description: "d", is_private: false },
        ctx,
      ),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("update-stream: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!(
        { stream_id: 4, new_name: "n", description: "d", is_private: false },
        ctx,
      ),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("update-stream: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () =>
      await action.execute!(
        { stream_id: 4, new_name: "n", description: "d", is_private: false },
        ctx,
      ),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-stream: nothing to change is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ stream_id: 4 }, ctx),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});
