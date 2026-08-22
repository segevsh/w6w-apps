import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/domain-create.ts";

Deno.test("domain-create: returns the DNS records the domain still needs", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "d_1", name: "mail.example.com", status: "not_started", records: [{ type: "MX" }] },
  }], { display: {} });
  const result = await action.execute!({ name: "mail.example.com", region: "eu-west-1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "mail.example.com", region: "eu-west-1" });
  // Creating does not verify — the records are the point.
  assertEquals((result as Record<string, unknown>).status, "not_started");
});

Deno.test("domain-create: a name is required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`name`");
  assertEquals(calls.length, 0);
});
