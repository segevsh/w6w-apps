import { assert, assertEquals, assertRejects } from "@std/assert";
import getKakaoTemplate from "../../actions/get-kakao-template.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "templateId": "KA01TP1",
};
const run = (
  ctx: Parameters<typeof getKakaoTemplate.execute>[1],
  input: Record<string, unknown> = sample,
) => getKakaoTemplate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("get-kakao-template: declares a read action with a description, params and output", () => {
  assertEquals(getKakaoTemplate.key, "get-kakao-template");
  assertEquals(getKakaoTemplate.type, "read");
  assert((getKakaoTemplate.description ?? "").length > 0);
  assert(Array.isArray(getKakaoTemplate.output) && getKakaoTemplate.output.length > 0);
  assertEquals(getKakaoTemplate.idempotent, undefined);
});

Deno.test("get-kakao-template: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "templateId": "KA01TP1",
      "content": "#{name}님",
      "status": "APPROVED",
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "template": {
      "templateId": "KA01TP1",
      "content": "#{name}님",
      "status": "APPROVED",
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/kakao/v2/templates/KA01TP1");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-kakao-template: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
