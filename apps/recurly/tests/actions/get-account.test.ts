import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-account.ts";

Deno.test("get-account: is a read action requiring accountId", () => {
  assertEquals(action.key, "get-account");
  assertEquals(action.type, "read");
  const p = (action.params ?? []).find((p) => p.key === "accountId")!;
  assertEquals(p.required, true);
});

Deno.test("get-account: GETs /accounts/{id}, percent-encoding the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "code-bob marley" } }]);
  await action.execute({ accountId: "code-bob marley" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/accounts/code-bob%20marley");
});

Deno.test("get-account: passes a bare Recurly ID through unprefixed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ accountId: "e28zov4fw0v2" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/accounts/e28zov4fw0v2");
});

Deno.test("get-account: returns the account object unchanged", async () => {
  const body = { id: "a1", code: "bob", state: "active" };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({ accountId: "a1" }, connected(ctx)), body);
});
