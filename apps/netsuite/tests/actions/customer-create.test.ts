import { assertEquals, assertRejects } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { BASE, created, mockCtx, run } from "../_helpers.ts";

Deno.test("customer-create: builds the documented body, subsidiary as a reference", async () => {
  const { ctx, calls } = mockCtx([created("customer", "647")]);
  const out = await run(customerCreate, {
    companyName: "My Company",
    email: "a@b.com",
    subsidiary: "1",
    externalId: "CID001",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/customer`);
  assertEquals(JSON.parse(calls[0].body!), {
    companyName: "My Company",
    email: "a@b.com",
    subsidiary: { id: "1" },
    externalId: "CID001",
  });
  assertEquals(out.id, "647");
});

Deno.test("customer-create: an individual sets isPerson; additionalFields win", async () => {
  const { ctx, calls } = mockCtx([created("customer", "1")]);
  await run(customerCreate, {
    isPerson: true,
    firstName: "John",
    lastName: "Smith",
    email: "a@b.com",
    additionalFields: { email: "override@b.com", custentity_x: 1 },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    isPerson: true,
    firstName: "John",
    lastName: "Smith",
    email: "override@b.com",
    custentity_x: 1,
  });
});

Deno.test("customer-create: an empty customer is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await run(customerCreate, { isPerson: false }, ctx),
    Error,
    "at least",
  );
  assertEquals(calls.length, 0);
});
