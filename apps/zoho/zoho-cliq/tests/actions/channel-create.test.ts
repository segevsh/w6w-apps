import { assertEquals, assertRejects } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/channel-create.ts";

Deno.test("channel-create: creates a private channel with members", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 201, "body": { "channel_id": "O9" } }]);
  const out = await action.execute(
    {
      "name": "Support",
      "level": "private",
      "description": "d",
      "inviteOnly": true,
      "userIds": "1, 2",
      "emailIds": ["x@y.z"],
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channels");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Support",
    "level": "private",
    "description": "d",
    "invite_only": true,
    "user_ids": ["1", "2"],
    "email_ids": ["x@y.z"],
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "channel": { "channel_id": "O9" } });
});

Deno.test("channel-create: rejects a team channel with no team ids", async () => {
  const { ctx, calls } = mockCliqCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ "name": "x", "level": "team" } as never, ctx)),
    Error,
    "teamIds",
  );
  assertEquals(calls.length, 0);
});

Deno.test("channel-create: idempotent is declared as false", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
