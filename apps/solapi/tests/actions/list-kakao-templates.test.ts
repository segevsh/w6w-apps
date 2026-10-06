import { assert, assertEquals, assertRejects } from "@std/assert";
import listKakaoTemplates from "../../actions/list-kakao-templates.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "status": "APPROVED",
  "channelId": "KA01PF1",
};
const run = (
  ctx: Parameters<typeof listKakaoTemplates.execute>[1],
  input: Record<string, unknown> = sample,
) => listKakaoTemplates.execute(input as never, ctx) as Promise<unknown>;

Deno.test("list-kakao-templates: declares a read action with a description, params and output", () => {
  assertEquals(listKakaoTemplates.key, "list-kakao-templates");
  assertEquals(listKakaoTemplates.type, "read");
  assert((listKakaoTemplates.description ?? "").length > 0);
  assert(Array.isArray(listKakaoTemplates.output) && listKakaoTemplates.output.length > 0);
  assertEquals(listKakaoTemplates.idempotent, undefined);
});

Deno.test("list-kakao-templates: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "templateList": [
        {
          "templateId": "KA01TP1",
          "status": "APPROVED",
        },
      ],
      "limit": 20,
      "nextKey": "T9",
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [
      {
        "templateId": "KA01TP1",
        "status": "APPROVED",
      },
    ],
    "count": 1,
    "nextKey": "T9",
    "limit": 20,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/kakao/v2/templates/");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "status": "APPROVED",
    "channelId": "KA01PF1",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("list-kakao-templates: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
