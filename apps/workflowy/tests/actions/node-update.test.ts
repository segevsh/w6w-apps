import { assertEquals, assertRejects } from "@std/assert";
import nodeUpdate from "../../actions/node-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const OK = { status: "ok" };
Deno.test("node-update: POSTs only the changed fields to /nodes/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await nodeUpdate.execute({ id: "abc", name: "New", note: "" }, ctx);
  assertEquals(out, OK);
  assertEquals(pathOf(calls[0].url), "/api/v1/nodes/abc");
  assertEquals(JSON.parse(calls[0].body!), { name: "New" });
});

Deno.test("node-update: refuses an empty update without a request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await nodeUpdate.execute({ id: "abc" }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
