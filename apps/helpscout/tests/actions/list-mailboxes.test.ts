import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-mailboxes.ts";

Deno.test("list-mailboxes: GETs /mailboxes and unwraps _embedded.mailboxes", async () => {
  const { ctx, calls } = mockCtx([{
    body: { _embedded: { mailboxes: [{ id: 1, name: "Help Scout" }] } },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/mailboxes");
  assertEquals(out, { mailboxes: [{ id: 1, name: "Help Scout" }] });
});

Deno.test("list-mailboxes: returns an empty array when _embedded is absent", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute({}, ctx), { mailboxes: [] });
});
