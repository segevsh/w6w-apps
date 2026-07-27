import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-update.ts";

Deno.test("person-update: PUTs /persons/{id} with mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 9 } } }]);
  await action.execute!({ personId: 9, name: "Ada L.", ownerId: 2 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/persons/9");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Ada L.", owner_id: 2 });
});
