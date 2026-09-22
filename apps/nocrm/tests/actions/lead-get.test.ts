import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

Deno.test("lead-get: GETs one lead by id", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: { id: 8113, title: "Loretta Inc." } }]);
  const lead = await action.execute({ leadId: "8113" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/8113");
  assertEquals(calls[0].method, "GET");
  assertEquals(lead, { id: 8113, title: "Loretta Inc." });
});

Deno.test("lead-get: encodes an id so a path segment cannot be smuggled in", async () => {
  const { ctx, calls } = mockNocrmCtx([{ body: {} }]);
  await action.execute({ leadId: "81/13" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/81%2F13");
});

Deno.test("lead-get: a 404 reports the vendor's record_not_found type", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 404,
    body: { error: 404, message: "Record not found", type: "record_not_found" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ leadId: "1" }, ctx)),
    Error,
    "record_not_found",
  );
});
