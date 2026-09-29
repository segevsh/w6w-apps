import { assertEquals } from "@std/assert";
import updateForm from "../../actions/update-form.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-form: PUTs /v1/forms/{slugOrId} with the FormUpdate body shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ form: { id: "f1" } }) }]);
  const out = await updateForm.execute(
    { slugOrId: "f1", title: "New Title", disabled: true, customSlug: "new-slug" },
    ctx,
  ) as { form?: { id?: string } };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "New Title",
    disabled: true,
    custom_slug: "new-slug",
  });
  assertEquals(out.form?.id, "f1");
});

Deno.test("update-form: declares idempotent true", () => {
  assertEquals(updateForm.idempotent, true);
});
