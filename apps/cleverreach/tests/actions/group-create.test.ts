import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/group-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-create: POSTs the group", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, name: "News" } }]);
  const out = await action.execute({
    name: "News",
    receiverInfo: "weekly",
    locked: false,
    backup: true,
  }, ctx) as { item: { id: number } };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/groups");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "News",
    receiver_info: "weekly",
    locked: false,
    backup: true,
  });
  assertEquals(out.item.id, 7);
});

Deno.test("group-create: omits unset optional fields and requires a name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "Only" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Only" });
  await assertRejects(
    async () => await action.execute({ name: "" }, ctx),
    Error,
    "`name` is required",
  );
  assertEquals(calls.length, 1);
});
