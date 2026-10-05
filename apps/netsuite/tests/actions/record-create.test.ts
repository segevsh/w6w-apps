import { assertEquals, assertRejects } from "@std/assert";
import recordCreate from "../../actions/record-create.ts";
import { BASE, created, mockCtx, nsError, run } from "../_helpers.ts";

Deno.test("record-create: POSTs the JSON body; the id comes from the Location header", async () => {
  const { ctx, calls } = mockCtx([created("customer", "647")]);
  const out = await run(recordCreate, {
    recordType: "customer",
    fields: { entityid: "New Customer", subsidiary: { id: "1" } },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/customer`);
  assertEquals(JSON.parse(calls[0].body!), { entityid: "New Customer", subsidiary: { id: "1" } });
  assertEquals(out, { id: "647", location: `${BASE}/services/rest/record/v1/customer/647` });
});

Deno.test("record-create: accepts the fields as a typed JSON string and adds externalId", async () => {
  const { ctx, calls } = mockCtx([created("customer", "1")]);
  await run(recordCreate, {
    recordType: "customer",
    fields: '{"firstName":"John"}',
    externalId: "CID001",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { firstName: "John", externalId: "CID001" });
});

Deno.test("record-create: bad JSON and non-object bodies are refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await run(recordCreate, { recordType: "customer", fields: "{nope" }, ctx),
    Error,
    "not valid JSON",
  );
  await assertRejects(
    async () => await run(recordCreate, { recordType: "customer", fields: "[1]" }, ctx),
    Error,
    "must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-create: NetSuite's validation error is raised with its code", async () => {
  const { ctx } = mockCtx([
    nsError(400, "INVALID_CONTENT", "You have entered an Invalid Field Value"),
  ]);
  await assertRejects(
    async () =>
      await run(recordCreate, { recordType: "salesOrder", fields: { entity: { id: 1 } } }, ctx),
    Error,
    "Invalid Field Value",
  );
});
