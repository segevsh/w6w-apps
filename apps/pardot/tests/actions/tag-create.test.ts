import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/tag-create.ts";

Deno.test("tag-create: POSTs {name} to /tags", async () => {
  const { ctx, calls } = mockPardotCtx([{
    status: 201,
    body: { id: 2000, name: "Marketing Asset" },
  }]);
  const out = await action.execute({ name: "Marketing Asset" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/tags");
  assertEquals(JSON.parse(calls[0].body!), { name: "Marketing Asset" });
  assertEquals(out, { id: 2000, name: "Marketing Asset" });
});

Deno.test("tag-create: honours a caller field list", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 201, body: { id: 1 } }]);
  await action.execute({ name: "x", fields: "id" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "id");
});

Deno.test("tag-create: surfaces the vendor error", async () => {
  const { ctx } = mockPardotCtx([{ status: 400, body: { code: 7, message: "Tag exists" } }]);
  await assertRejects(
    async () => await action.execute({ name: "x" }, ctx),
    Error,
    "[7] Tag exists",
  );
});
