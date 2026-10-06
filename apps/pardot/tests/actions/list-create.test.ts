import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/list-create.ts";

Deno.test("list-create: POSTs the list; blank optional fields are omitted", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 201, body: { id: 242713, name: "L" } }]);
  const out = await action.execute(
    { name: "L", title: "", description: "d", isPublic: false, campaignId: 7517 },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/lists");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "L",
    description: "d",
    isPublic: false,
    campaignId: 7517,
  });
  assertEquals(out, { id: 242713, name: "L" });
});

Deno.test("list-create: a 204 still reports success", async () => {
  const { ctx } = mockPardotCtx([{ status: 204 }]);
  assertEquals(await action.execute({ name: "L" }, ctx), { created: true });
});

Deno.test("list-create: surfaces the vendor error", async () => {
  const { ctx } = mockPardotCtx([{ status: 400, body: { code: 1, message: "Name required" } }]);
  await assertRejects(
    async () => await action.execute({ name: "" }, ctx),
    Error,
    "[1] Name required",
  );
});
