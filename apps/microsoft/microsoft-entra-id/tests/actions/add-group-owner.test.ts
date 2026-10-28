import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-group-owner.ts";

Deno.test("add-group-owner: POSTs a users reference to /owners/$ref", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ groupId: "g1", ownerId: "u1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1/owners/$ref");
  assertEquals(JSON.parse(calls[0].body!), {
    "@odata.id": "https://graph.microsoft.com/v1.0/users/u1",
  });
  assertEquals(out, { added: true, groupId: "g1", ownerId: "u1" });
});

Deno.test("add-group-owner: requires an owner and is not idempotent", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "g1", ownerId: "" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});
