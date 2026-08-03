import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get.ts";

Deno.test("form-get: GETs /form/{formID} and returns the form", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "31504059977966", title: "Contact Us", status: "ENABLED" }) },
  ]);
  const result = await action.execute({ formId: "31504059977966" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/form/31504059977966");
  assertEquals(result, { id: "31504059977966", title: "Contact Us", status: "ENABLED" });
});

Deno.test("form-get: URL-encodes the form ID", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await action.execute({ formId: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/form/a%2Fb%20c");
});
