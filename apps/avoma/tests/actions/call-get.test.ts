import { assertEquals, assertRejects } from "@std/assert";
import callGet from "../../actions/call-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-get: addressed by external id, URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { external_id: "tw/CA1" } }]);
  const out = await callGet.execute({ externalId: "tw/CA1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/calls/tw%2FCA1/");
  assertEquals(out, { external_id: "tw/CA1" });
});

Deno.test("call-get: a blank external id is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await callGet.execute({ externalId: "" }, ctx),
    Error,
    "required",
  );
});
