import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/group-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-update: PUTs only the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, name: "Renamed" } }]);
  await action.execute({ groupId: "7", name: "Renamed", locked: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v3/groups/7");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed", locked: true });
});

Deno.test("group-update: refuses an empty update without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "7" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
