import { assert, assertEquals } from "@std/assert";
import { mockZendeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-update.ts";

Deno.test("ticket-update: PUTs only the supplied fields", async () => {
  const { ctx, calls } = mockZendeskCtx([{ body: { ticket: {} } }]);
  await action.execute({ ticketId: 7, status: "solved" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { ticket: { status: "solved" } });
});

Deno.test("ticket-update: warns that tags replace rather than append", () => {
  assert(action.params?.find((p) => p.key === "tags")?.hint?.includes("REPLACES"));
});
