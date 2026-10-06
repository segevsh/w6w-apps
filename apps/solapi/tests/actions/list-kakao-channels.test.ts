import { assert, assertEquals, assertRejects } from "@std/assert";
import listKakaoChannels from "../../actions/list-kakao-channels.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "searchId": "@example",
};
const run = (
  ctx: Parameters<typeof listKakaoChannels.execute>[1],
  input: Record<string, unknown> = sample,
) => listKakaoChannels.execute(input as never, ctx) as Promise<unknown>;

Deno.test("list-kakao-channels: declares a read action with a description, params and output", () => {
  assertEquals(listKakaoChannels.key, "list-kakao-channels");
  assertEquals(listKakaoChannels.type, "read");
  assert((listKakaoChannels.description ?? "").length > 0);
  assert(Array.isArray(listKakaoChannels.output) && listKakaoChannels.output.length > 0);
  assertEquals(listKakaoChannels.idempotent, undefined);
});

Deno.test("list-kakao-channels: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "channelList": [
        {
          "channelId": "KA01PF1",
          "searchId": "@example",
        },
      ],
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [
      {
        "channelId": "KA01PF1",
        "searchId": "@example",
      },
    ],
    "count": 1,
    "nextKey": null,
    "limit": null,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/kakao/v2/channels");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "searchId": "@example",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("list-kakao-channels: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
