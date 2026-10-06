import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-messenger-profile-fields.ts";

Deno.test("delete-messenger-profile-fields: DELETE with a fields array body", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success" } }]);
  const out = await action.execute!({ fields: "persistent_menu, ice_breakers" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/me/messenger_profile");
  assertEquals(bodyOf(calls[0]), { fields: ["persistent_menu", "ice_breakers"] });
  assertEquals(out, { result: "success" });
});

Deno.test("delete-messenger-profile-fields: blank fields fail locally", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ fields: " , " }, ctx), Error, "fields");
  await assertRejects(async () => await action.execute!({ fields: "" }, ctx), Error, "fields");
  assertEquals(calls.length, 0);
});
