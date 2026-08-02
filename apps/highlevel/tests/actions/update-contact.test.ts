import { assertEquals } from "@std/assert";
import { mockHighLevelCtx } from "../_helpers.ts";
import action from "../../actions/update-contact.ts";

Deno.test("update-contact: PUTs /contacts/:contactId with the changed fields", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { contact: { id: "c1" } } }]);
  await action.execute!({ contactId: "c1", firstName: "Grace" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/c1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.firstName, "Grace");
  assertEquals(body.locationId, undefined);
});
