import { assertEquals, assertRejects } from "@std/assert";
import recordUpsert from "../../actions/record-upsert.ts";
import { BASE, created, mockCtx, run } from "../_helpers.ts";

Deno.test("record-upsert: PUTs to the eid: URL", async () => {
  const { ctx, calls } = mockCtx([created("customer", "88")]);
  const out = await run(recordUpsert, {
    recordType: "customer",
    externalId: "CID002",
    fields: { firstName: "John", lastName: "Smith" },
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/customer/eid:CID002`);
  assertEquals(JSON.parse(calls[0].body!), { firstName: "John", lastName: "Smith" });
  assertEquals(out.id, "88");
});

Deno.test("record-upsert: the external id is percent-encoded into the path", async () => {
  const { ctx, calls } = mockCtx([created("customer", "1")]);
  await run(recordUpsert, { recordType: "customer", externalId: "a/b c", fields: {} }, ctx);
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/customer/eid:a%2Fb%20c`);
});

Deno.test("record-upsert: an empty external id is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await run(recordUpsert, { recordType: "customer", externalId: " ", fields: {} }, ctx),
    Error,
    "external id is required",
  );
  assertEquals(calls.length, 0);
});
