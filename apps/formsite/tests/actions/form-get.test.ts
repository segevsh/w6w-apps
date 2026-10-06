import { assertEquals } from "@std/assert";
import { mockFormsiteCtx } from "../_helpers.ts";
import formGet from "../../actions/form-get.ts";

const B = "https://fs3.formsite.com/api/v2/acme";

Deno.test("form-get: GETs /forms/:dir and unwraps the single form", async () => {
  const { ctx, calls } = mockFormsiteCtx([{ body: { forms: [{ directory: "f 1" }] } }]);
  const out = await formGet.execute({ formDir: "f 1" }, ctx);
  assertEquals(calls[0].url, B + "/forms/f%201");
  assertEquals(out, { form: { directory: "f 1" } });
});

Deno.test("form-get: null when the form is absent", async () => {
  const { ctx } = mockFormsiteCtx([{ body: { forms: [] } }]);
  assertEquals(await formGet.execute({ formDir: "x" }, ctx), { form: null });
});
