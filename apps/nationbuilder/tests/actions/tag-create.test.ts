import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/tag-create.ts";

Deno.test("tag-create: POSTs /signup_tags", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "7", type: "signup_tags", attributes: { name: "volunteer" } } },
  }]);
  const out = await action.execute({ name: "volunteer" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signup_tags");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "signup_tags", attributes: { name: "volunteer" } },
  });
  assertEquals(out, { id: "7", type: "signup_tags", name: "volunteer" });
});
