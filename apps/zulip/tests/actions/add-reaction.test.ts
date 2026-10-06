import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/add-reaction.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("add-reaction: sends the emoji as a form body", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  const out = await action.execute!({
    message_id: 8,
    emoji_name: "octopus",
    reaction_type: "unicode_emoji",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages/8/reactions");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { emoji_name: "octopus", reaction_type: "unicode_emoji" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, {});
});

Deno.test("add-reaction: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  await action.execute!(
    { message_id: 8, emoji_name: "octopus", reaction_type: "unicode_emoji" },
    ctx,
  );
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("add-reaction: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        message_id: 8,
        emoji_name: "octopus",
        reaction_type: "unicode_emoji",
      }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("add-reaction: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        message_id: 8,
        emoji_name: "octopus",
        reaction_type: "unicode_emoji",
      }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("add-reaction: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () =>
      await action.execute!({
        message_id: 8,
        emoji_name: "octopus",
        reaction_type: "unicode_emoji",
      }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("add-reaction: a missing emoji is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ message_id: 8 }, ctx), Error, "emoji_");
  assertEquals(calls.length, 0);
});
