import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/receiver-set-active.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("receiver-set-active: activates", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  await action.execute({ groupId: "5", receiver: "11", active: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v3/groups/5/receivers/11/activate");
  assertEquals(calls[0].body, null);
});

Deno.test("receiver-set-active: deactivates", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  await action.execute({ groupId: "5", receiver: "a@b.co", active: false }, ctx);
  assertEquals(
    calls[0].url,
    "https://rest.cleverreach.com/v3/groups/5/receivers/a%40b.co/deactivate",
  );
});

Deno.test("receiver-set-active: requires an explicit boolean", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "5", receiver: "11" }, ctx),
    Error,
    "`active` is required",
  );
  assertEquals(calls.length, 0);
});
