import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audience-create.ts";

Deno.test("audience-create: posts the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "a_1", name: "Newsletter" } }], {
    display: {},
  });
  await action.execute!({ name: "Newsletter" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Newsletter" });
});

Deno.test("audience-create: a name is required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ name: " " }, ctx), Error, "`name`");
  assertEquals(calls.length, 0);
});
