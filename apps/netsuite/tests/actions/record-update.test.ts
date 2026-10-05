import { assertEquals } from "@std/assert";
import recordUpdate from "../../actions/record-update.ts";
import { BASE, created, mockCtx, run } from "../_helpers.ts";

Deno.test("record-update: PATCHes only the given fields", async () => {
  const { ctx, calls } = mockCtx([created("customer", "107")]);
  const out = await run(recordUpdate, {
    recordType: "customer",
    id: "107",
    fields: { entityid: "Updated Customer" },
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/customer/107`);
  assertEquals(JSON.parse(calls[0].body!), { entityid: "Updated Customer" });
  assertEquals(out.id, "107");
});

Deno.test("record-update: a null field is sent as null (NetSuite deletes the field)", async () => {
  const { ctx, calls } = mockCtx([created("customer", "eid:A")]);
  await run(recordUpdate, { recordType: "customer", id: "eid:A", fields: '{"body1":null}' }, ctx);
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/customer/eid:A`);
  assertEquals(calls[0].body, '{"body1":null}');
});
