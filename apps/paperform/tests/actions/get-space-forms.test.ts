import { assertEquals } from "@std/assert";
import getSpaceForms from "../../actions/get-space-forms.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-space-forms: GETs /v1/spaces/{id}/forms and unwraps results.forms", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ forms: [{ id: "f1" }] }) }]);
  const out = await getSpaceForms.execute({ id: "sp1" }, ctx) as { forms: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/spaces/sp1/forms");
  assertEquals(out.forms.length, 1);
});

Deno.test("get-space-forms: an empty result set returns an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope({}) }]);
  const out = await getSpaceForms.execute({ id: "sp1" }, ctx) as { forms: unknown[] };
  assertEquals(out.forms, []);
});
