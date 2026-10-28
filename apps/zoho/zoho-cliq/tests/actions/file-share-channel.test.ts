import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/file-share-channel.ts";

Deno.test("file-share-channel: uploads by unique name as a bot", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 204 }]);
  const out = await action.execute(
    { "channelUniqueName": "marketing", "file": "aGVsbG8=", "botUniqueName": "b1" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channelsbyname/marketing/files");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), { "bot_unique_name": "b1" });
  assert(calls[0].body === "[object FormData]", "expected a multipart FormData body");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "success": true });
});

Deno.test("file-share-channel: needs a channel id or unique name", async () => {
  const { ctx, calls } = mockCliqCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ "file": "aGk=" } as never, ctx)),
    Error,
    "channel id or a channel unique name",
  );
  assertEquals(calls.length, 0);
});

Deno.test("file-share-channel: idempotent is declared as false", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
