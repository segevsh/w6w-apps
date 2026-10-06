import { assertEquals } from "@std/assert";
import action from "../../actions/account-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-update: PATCHes only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "a1", is_disabled: true } } }]);
  const out = await action.execute!({ id: "a1", isDisabled: true, name: "New" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/accounts/a1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { is_disabled: true, name: "New" });
  assertEquals(out, { id: "a1", is_disabled: true });
});

Deno.test("account-update: an empty owner removes it and an empty tag list clears tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ id: "a1", ownerId: "", tags: [] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { owner_id: "", tags: [] });
});
