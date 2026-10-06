import { assertEquals } from "@std/assert";
import nodeCreate from "../../actions/node-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("node-create: POSTs the body and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ body: { item_id: "n1" } }]);
  const out = await nodeCreate.execute(
    { name: "**Hi**", parent_id: "inbox", position: "bottom", note: "", layoutMode: "todo" },
    ctx,
  );
  assertEquals(out, { id: "n1" });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes");
  assertEquals(JSON.parse(calls[0].body!), {
    parent_id: "inbox",
    name: "**Hi**",
    layoutMode: "todo",
    position: "bottom",
  });
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("node-create: omits unset optionals; a vendor error is thrown", async () => {
  const a = mockCtx([{ body: { item_id: "n2" } }]);
  await nodeCreate.execute({ name: "x" }, a.ctx);
  assertEquals(JSON.parse(a.calls[0].body!), { name: "x" });
  const b = mockCtx([{ status: 404, body: { errors: "parent not found" } }]);
  let err: unknown;
  try {
    await nodeCreate.execute({ name: "x", parent_id: "zz" }, b.ctx);
  } catch (e) {
    err = e;
  }
  assertEquals((err as Error).message, "Workflowy API error 404: parent not found");
});
