import { assertEquals } from "@std/assert";
import getForm from "../../actions/get-form.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-form: GETs /v1/forms/{slugOrId} and unwraps results.form", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ form: { id: "f1", title: "T" } }),
  }]);
  const out = await getForm.execute({ slugOrId: "my-form-slug" }, ctx) as {
    form?: { id?: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/forms/my-form-slug");
  assertEquals(out.form?.id, "f1");
});

Deno.test("get-form: URL-encodes the slug/id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ form: {} }) }]);
  await getForm.execute({ slugOrId: "a b/c" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/forms/a%20b%2Fc");
});
