import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-group.ts";

Deno.test("get-group: GETs /groups/{id} with $select", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "g1", displayName: "Sales" } }]);
  const out = await action.execute({ groupId: "g1", select: ["id", "mail"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/groups/g1");
  assertEquals(url.searchParams.get("$select"), "id,mail");
  assertEquals(out.displayName, "Sales");
});

Deno.test("get-group: a 404 surfaces Graph's code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: { code: "Request_ResourceNotFound", message: "missing" } },
  }]);
  await assertRejects(
    async () => await action.execute({ groupId: "x" }, ctx),
    Error,
    "Request_ResourceNotFound",
  );
});
