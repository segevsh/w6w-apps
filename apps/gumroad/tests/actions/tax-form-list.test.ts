import { assertEquals, assertRejects } from "@std/assert";
import taxFormList from "../../actions/tax-form-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "year": 5 };

Deno.test("tax-form-list: sends GET /v2/tax_forms with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "tax_forms": [{ "id": "a" }] } }]);
  await taxFormList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/tax_forms");
  assertEquals(queryOf(calls[0].url), { "year": "5" });
  assertEquals(calls[0].body, null);
});

Deno.test("tax-form-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "tax_forms": [{ "id": "a" }] } }]);
  assertEquals(await taxFormList.execute(INPUT, ctx), { "taxForms": [{ "id": "a" }] });
});

Deno.test("tax-form-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(taxFormList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("tax-form-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(taxFormList.execute(INPUT, ctx)), Error, "refused");
});
