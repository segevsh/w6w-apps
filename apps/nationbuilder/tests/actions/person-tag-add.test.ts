import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/person-tag-add.ts";

Deno.test("person-tag-add: POSTs /signup_taggings", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: {
      data: { id: "9", type: "signup_taggings", attributes: { signup_id: "42", tag_id: "7" } },
    },
  }]);
  const out = await action.execute({ personId: "42", tagId: "7" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signup_taggings");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "signup_taggings", attributes: { signup_id: "42", tag_id: "7" } },
  });
  assertEquals(out, { id: "9", type: "signup_taggings", signup_id: "42", tag_id: "7" });
});
