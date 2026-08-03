import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get.ts";

Deno.test("form-get: GETs one form and surfaces blocks and settings", async () => {
  const form = {
    id: "f1",
    name: "Signup",
    status: "PUBLISHED",
    blocks: [{ uuid: "b1", type: "FORM_TITLE" }],
    settings: { language: "en" },
  };
  const { ctx, calls } = mockCtx([{ body: form }]);
  const result = await action.execute({ formId: "f1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/forms/f1");
  assertEquals(result.status, "PUBLISHED");
  assertEquals(result.blocks, [{ uuid: "b1", type: "FORM_TITLE" }]);
  assertEquals(result.settings, { language: "en" });
  assertEquals(result.form, form);
});

Deno.test("form-get: defaults blocks to an empty array", async () => {
  const { ctx } = mockCtx([{ body: { id: "f1" } }]);
  const result = await action.execute({ formId: "f1" }, ctx);
  assertEquals(result.blocks, []);
});
