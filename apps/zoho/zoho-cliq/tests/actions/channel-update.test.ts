import { assertEquals, assertRejects } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/channel-update.ts";

Deno.test("channel-update: updates name and config", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "data": { "name": "#New" } } }]);
  const out = await action.execute(
    { "channelId": "O1", "name": "New", "config": { "reply_mode": "threads" } } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channels/O1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "New",
    "config": { "reply_mode": "threads" },
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "channel": { "name": "#New" } });
});

Deno.test("channel-update: rejects an empty update", async () => {
  const { ctx, calls } = mockCliqCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ "channelId": "O1" } as never, ctx)),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("channel-update: idempotent is declared as true", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
