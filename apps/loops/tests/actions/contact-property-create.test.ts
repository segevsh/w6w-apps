import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-property-create.ts";

Deno.test("contact-property-create: POSTs the name and type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }]);
  await action.execute!({ name: "plan", type: "string" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "plan", type: "string" });
});

Deno.test("contact-property-create: defaults the type rather than sending nothing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ name: "plan" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).type, "string");
});

/** Loops offers no way to change a property's type or delete it. */
Deno.test("contact-property-create: the type hint says it is permanent", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "type")!;
  assert(param.hint!.includes("PERMANENT"), param.hint);
});

Deno.test("contact-property-create: a name is required, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`name` is required");
  assertEquals(calls.length, 0);
});
