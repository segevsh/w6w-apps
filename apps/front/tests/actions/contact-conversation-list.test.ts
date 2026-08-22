import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-conversation-list.ts";

Deno.test("contact-conversation-list: reads one person's whole history", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [{ id: "cnv_1" }] } }]);
  assertEquals(
    await action.execute!({ contactId: "alt:email:ada@example.com", statuses: ["assigned"] }, ctx),
    [{ id: "cnv_1" }],
  );
  const url = new URL(calls[0].url);
  assertEquals(
    decodeURIComponent(url.pathname),
    "/contacts/alt:email:ada@example.com/conversations",
  );
  assertEquals(url.searchParams.getAll("q[statuses]"), ["assigned"]);
});

Deno.test("contact-conversation-list: a missing contact is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "contactId");
});
