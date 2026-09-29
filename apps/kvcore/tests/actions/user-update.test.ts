import { assertEquals } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-update: PUTs to /user/{id} without the id in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, email: "new@kvcore.com" } }]);
  await userUpdate.execute({ user_id: "1", email: "new@kvcore.com" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/public/user/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { email: "new@kvcore.com" });
  assertEquals("user_id" in body, false);
});

Deno.test("user-update: primary_office_id is NOT offered — it is create-only", () => {
  assertEquals((userUpdate.params ?? []).some((p) => p.key === "primary_office_id"), false);
});
