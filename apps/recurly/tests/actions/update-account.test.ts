import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/update-account.ts";

Deno.test("update-account: is an idempotent perform action requiring accountId", () => {
  assertEquals(action.key, "update-account");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  const p = (action.params ?? []).find((p) => p.key === "accountId")!;
  assertEquals(p.required, true);
});

Deno.test("update-account: PUTs /accounts/{id} with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "a1" } }]);
  await action.execute({ accountId: "a1", email: "new@example.com" }, connected(ctx));
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/accounts/a1");
  assertEquals(JSON.parse(calls[0].body ?? "{}").email, "new@example.com");
});

Deno.test("update-account: omits unset fields, never blanking them", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ accountId: "a1", company: "Acme" }, connected(ctx));
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body, { company: "Acme" });
});
