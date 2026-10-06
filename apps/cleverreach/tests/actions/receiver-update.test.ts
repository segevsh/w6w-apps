import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/receiver-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("receiver-update: PUTs the changed fields to the receiver in the group", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 11 } }]);
  await action.execute({
    groupId: "5",
    receiver: "bruce@gotham.com",
    source: "Cave",
    globalAttributes: { lastname: "Wayne" },
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://rest.cleverreach.com/v3/groups/5/receivers/bruce%40gotham.com",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    source: "Cave",
    global_attributes: { lastname: "Wayne" },
  });
});

Deno.test("receiver-update: refuses an empty update without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "5", receiver: "11" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
