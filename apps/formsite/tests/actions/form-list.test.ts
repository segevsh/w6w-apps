import { assertEquals } from "@std/assert";
import { mockFormsiteCtx } from "../_helpers.ts";
import formList from "../../actions/form-list.ts";

const B = "https://fs3.formsite.com/api/v2/acme";

Deno.test("form-list: GETs /forms and returns the array", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: { forms: [{ directory: "f1" }] } }]);
  const out = await formList.execute({}, ctx);
  assertEquals(calls[0].url, B + "/forms");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { forms: [{ directory: "f1" }] });
});

Deno.test("form-list: tolerates a missing forms key", async () => {
  const { ctx } = mockFormsiteCtx([{ body: {} }]);
  assertEquals(await formList.execute({}, ctx), { forms: [] });
});
