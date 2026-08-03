import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-create.ts";

Deno.test("workspace-create: POSTs the name to /workspaces", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "w2", name: "Ops" } }]);
  const result = await action.execute({ name: "Ops" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/workspaces");
  assertEquals(jsonBody(calls[0]), { name: "Ops" });
  assertEquals(result.id, "w2");
});

Deno.test("workspace-create: is not idempotent — a replay makes a second workspace", () => {
  assertEquals(action.idempotent, false);
});
