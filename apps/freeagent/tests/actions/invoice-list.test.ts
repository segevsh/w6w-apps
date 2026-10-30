import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

test("invoice-list: GETs /invoices with no params by default", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { invoices: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/invoices");
  assertEquals(url.search, "");
});

test("invoice-list: turns a bare contactId/projectId into full resource URLs", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { invoices: [] } }]);
  await action.execute({ contactId: "2", projectId: "3" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("contact"), "https://api.freeagent.com/v2/contacts/2");
  assertEquals(url.searchParams.get("project"), "https://api.freeagent.com/v2/projects/3");
});
