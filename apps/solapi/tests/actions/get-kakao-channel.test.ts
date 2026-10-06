import { assert, assertEquals, assertRejects } from "@std/assert";
import getKakaoChannel from "../../actions/get-kakao-channel.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "channelId": "KA01PF1",
};
const run = (
  ctx: Parameters<typeof getKakaoChannel.execute>[1],
  input: Record<string, unknown> = sample,
) => getKakaoChannel.execute(input as never, ctx) as Promise<unknown>;

Deno.test("get-kakao-channel: declares a read action with a description, params and output", () => {
  assertEquals(getKakaoChannel.key, "get-kakao-channel");
  assertEquals(getKakaoChannel.type, "read");
  assert((getKakaoChannel.description ?? "").length > 0);
  assert(Array.isArray(getKakaoChannel.output) && getKakaoChannel.output.length > 0);
  assertEquals(getKakaoChannel.idempotent, undefined);
});

Deno.test("get-kakao-channel: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "channelId": "KA01PF1",
      "searchId": "@example",
      "isBrand": false,
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "channel": {
      "channelId": "KA01PF1",
      "searchId": "@example",
      "isBrand": false,
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/kakao/v2/channels/KA01PF1");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-kakao-channel: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
