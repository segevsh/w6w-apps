import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import createLead from "../../actions/create-lead.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

test("create-lead: is a non-idempotent perform action", () => {
  assertEquals(createLead.type, "perform");
  assertEquals(createLead.idempotent, false);
});

test("create-lead: builds the lead payload from named fields", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 42, rev: "1" } }]);
  const result = await createLead.execute({
    primaryAccountId: "10",
    description: "A great new lead",
    priority: 1,
    tags: "hot, vip",
  }, ctx);

  assertEquals(rpcBody(calls[0]).method, "newLead");
  const lead = rpcBody(calls[0]).params.lead as Record<string, unknown>;
  assertEquals(lead.primaryAccount, { id: "10" });
  assertEquals(lead.description, "A great new lead");
  assertEquals(lead.priority, 1);
  assertEquals(lead.tags, ["hot", "vip"]);
  assertEquals(result.id, 42);
});

test("create-lead: an empty lead is still a valid call (all fields optional)", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 43 } }]);
  await createLead.execute({}, ctx);
  assertEquals(rpcBody(calls[0]).params.lead, {});
});

test("create-lead: Additional fields (values) merge over and can override named fields", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 44 } }]);
  await createLead.execute({ description: "base", values: '{"description":"overridden"}' }, ctx);
  const lead = rpcBody(calls[0]).params.lead as Record<string, unknown>;
  assertEquals(lead.description, "overridden");
});
