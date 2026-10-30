import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-update.ts";

test("ticket-update: PUTs only the supplied fields", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { ticket: {} } }]);
  await action.execute({ ticketId: 7, status: "solved" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { ticket: { status: "solved" } });
});

test("ticket-update: warns that tags replace rather than append", () => {
  assert(action.params?.find((p) => p.key === "tags")?.hint?.includes("REPLACES"));
});
