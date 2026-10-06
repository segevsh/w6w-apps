import { assertEquals, assertRejects } from "@std/assert";
import creditsGet from "../../actions/credits-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("credits-get: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await creditsGet.execute({} as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/credits");
  assertEquals(calls[0].body, null);
});

Deno.test("credits-get: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await creditsGet.execute({} as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
