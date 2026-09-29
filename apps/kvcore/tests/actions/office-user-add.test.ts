import { assertEquals } from "@std/assert";
import officeUserAdd from "../../actions/office-user-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("office-user-add: posts user_id/is_admin/is_primary as 1/0", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await officeUserAdd.execute(
    { office_id: "1", user_id: "123", is_admin: true, is_primary: false },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/office/1/user");
  assertEquals(JSON.parse(calls[0].body!), { user_id: "123", is_admin: 1, is_primary: 0 });
});

Deno.test("office-user-add: all three fields are required", () => {
  const required = (officeUserAdd.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["is_admin", "is_primary", "office_id", "user_id"]);
});
