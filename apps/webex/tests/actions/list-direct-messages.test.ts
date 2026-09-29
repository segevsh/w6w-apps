import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-direct-messages.ts";

Deno.test("list-direct-messages: GETs /messages/direct with personEmail", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "m1" }] } }]);
  const result = await action.execute({ personEmail: "jo@acme.test" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/messages/direct?personEmail=jo%40acme.test");
  assertEquals(result, [{ id: "m1" }]);
});
