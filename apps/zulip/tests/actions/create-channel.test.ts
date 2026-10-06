import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-channel.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("create-channel: creates a channel and always sends the subscribers list", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", id: 50 } }]);
  const out = await action.execute!({ name: "new", description: "d", invite_only: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/channels/create");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), {
    name: "new",
    description: "d",
    subscribers: "[]",
    invite_only: "true",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { id: 50 });
});

Deno.test("create-channel: subscribers become a JSON integer array", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", id: 51 } }]);
  const out = await action.execute!({ name: "new", subscribers: "3, 4" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/channels/create");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { name: "new", subscribers: "[3,4]" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { id: 51 });
});

Deno.test("create-channel: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", id: 50 } }]);
  await action.execute!({ name: "new", description: "d", invite_only: true }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("create-channel: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ name: "new", description: "d", invite_only: true }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("create-channel: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ name: "new", description: "d", invite_only: true }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("create-channel: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ name: "new", description: "d", invite_only: true }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
