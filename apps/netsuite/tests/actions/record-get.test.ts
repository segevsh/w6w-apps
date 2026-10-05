import { assertEquals, assertRejects } from "@std/assert";
import recordGet from "../../actions/record-get.ts";
import { BASE, mockCtx, nsError, run } from "../_helpers.ts";

Deno.test("record-get: GETs the record by id and returns the body", async () => {
  const rec = { id: "107", companyName: "Glenrock", links: [] };
  const { ctx, calls } = mockCtx([{ body: rec }]);
  const out = await run(recordGet, { recordType: "customer", id: "107" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/customer/107`);
  assertEquals(out, { record: rec });
});

Deno.test("record-get: external id, fields and expandSubResources reach the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await run(recordGet, {
    recordType: "customer",
    id: "eid:CID001",
    fields: " companyName,email ",
    expandSubResources: true,
  }, ctx);
  assertEquals(
    calls[0].url,
    `${BASE}/services/rest/record/v1/customer/eid:CID001?fields=companyName%2Cemail&expandSubResources=true`,
  );
});

Deno.test("record-get: a missing record surfaces NetSuite's own error", async () => {
  const { ctx } = mockCtx([nsError(404, "RCRD_DSNT_EXIST", "That record does not exist.")]);
  await assertRejects(
    async () => await run(recordGet, { recordType: "customer", id: "999" }, ctx),
    Error,
    "does not exist",
  );
});

Deno.test("record-get: a hostile record type never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await run(recordGet, { recordType: "../system", id: "1" }, ctx),
    Error,
    "Invalid record type",
  );
  assertEquals(calls.length, 0);
});
