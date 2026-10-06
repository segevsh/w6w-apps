import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/field-get.ts";

Deno.test("field-get: GETs the field, with detail on request", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "12345", name: "Plan", type: "Line" } }]);
  const out = await action.execute({ fieldId: "12345", detail: true }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/field/12345?detail=true");
  assertEquals(out, { id: "12345", name: "Plan", type: "Line" });
});

Deno.test("field-get: 404 is reported", async () => {
  const { ctx } = mockCtx([{ status: 404, body: ["There is no such entity."] }]);
  await assertRejects(
    async () => await action.execute({ fieldId: "9" }, ctx),
    Error,
    "no such entity",
  );
});
