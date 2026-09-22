import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-field.ts";

Deno.test("add-field: POSTs the field wrapped under the `field` body key", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "email", label: "Email" } }]);
  const result = await action.execute!(
    { tableId: "tbl1", field: { slug: "email", label: "Email", field_type: "email" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/add_field/");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    field: { slug: "email", label: "Email", field_type: "email" },
  });
  assertEquals(result, { slug: "email", label: "Email" });
});
