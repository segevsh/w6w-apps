import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-field.ts";

Deno.test("update-field: PUTs the field to change_field/", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "email" } }]);
  await action.execute!(
    { tableId: "tbl1", field: { slug: "email", label: "Work Email" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/change_field/");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { field: { slug: "email", label: "Work Email" } });
});

Deno.test("update-field: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
