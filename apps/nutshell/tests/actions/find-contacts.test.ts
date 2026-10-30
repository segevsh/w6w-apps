import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import findContacts from "../../actions/find-contacts.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

test("find-contacts: is a search action", () => {
  assertEquals(findContacts.type, "search");
});

test("find-contacts: builds query from leadId", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 4 }] }]);
  const result = await findContacts.execute({ leadId: "42" }, ctx);

  assertEquals(rpcBody(calls[0]).method, "findContacts");
  assertEquals(rpcBody(calls[0]).params.query, { leadId: "42" });
  assertEquals(result.count, 1);
});

test("find-contacts: accountId and tag combine (ANDed)", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await findContacts.execute({ accountId: "1", tag: "decision-maker" }, ctx);
  assertEquals(rpcBody(calls[0]).params.query, { accountId: "1", tag: ["decision-maker"] });
});
