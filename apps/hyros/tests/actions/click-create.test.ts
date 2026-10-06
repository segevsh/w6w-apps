import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, OK, pathOf } from "../_helpers.ts";
import clickCreate from "../../actions/click-create.ts";

Deno.test("click-create: POST /clicks with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await clickCreate.execute({
    referrerUrl: "https://x.io",
    integrationType: "FACEBOOK",
    adSourceId: "9",
    phones: "1,2",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/clicks");
  assertEquals(JSON.parse(calls[0].body!), {
    referrerUrl: "https://x.io",
    integrationType: "FACEBOOK",
    adSourceId: "9",
    phones: ["1", "2"],
  });
  assertEquals(out, { requestId: "req1", result: "OK" });
});

Deno.test("click-create: a platform without adSourceId is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () =>
      await clickCreate.execute({ referrerUrl: "https://x.io", integrationType: "GOOGLE" }, ctx),
    Error,
    "adSourceId",
  );
});
