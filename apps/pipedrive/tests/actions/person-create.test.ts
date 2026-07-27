import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-create.ts";

Deno.test("person-create: POSTs /persons and passes email/phone through", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { id: 1 } } }]);
  await action.execute!(
    { name: "Ada", email: ["ada@x.io"], phone: "555-1234", orgId: 3 },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/persons");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Ada");
  assertEquals(body.email, ["ada@x.io"]);
  assertEquals(body.phone, "555-1234");
  assertEquals(body.org_id, 3);
});
