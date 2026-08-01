import { assertEquals } from "@std/assert";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

Deno.test("user-update: POSTs a partial profile — omitted fields are absent, not null", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: { id: "00u1" } }]);
  await action.execute({ userId: "00u1", title: "Engineer" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/users/00u1");
  assertEquals(JSON.parse(calls[0].body!), { profile: { title: "Engineer" } });
});

Deno.test("user-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
