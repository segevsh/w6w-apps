import { assert, assertEquals, assertRejects } from "@std/assert";
import socialChannelList from "../../actions/social-channel-list.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("social-channel-list: GETs socialmedia/channels.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "channels": { "Facebook": { "count": 1, "pages": [] } } }),
  }]);
  const out = await socialChannelList.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/socialmedia/channels.json");
  assertEquals(queryOf(calls[0].url), {});
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "channels": { "Facebook": { "count": 1, "pages": [] } } });
});

Deno.test("social-channel-list: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "channels": { "Facebook": { "count": 1, "pages": [] } } }),
  }]);
  await socialChannelList.execute({} as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(socialChannelList.type, "read");
});

Deno.test("social-channel-list: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () => await socialChannelList.execute({} as never, ctx));
    assert((err as Error).message.includes("bad thing"));
  }
});
