import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-account.ts";

Deno.test("create-account: is a non-idempotent perform action requiring code", () => {
  assertEquals(action.key, "create-account");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  const p = (action.params ?? []).find((p) => p.key === "code")!;
  assertEquals(p.required, true);
});

Deno.test("create-account: POSTs /accounts with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "a1", code: "bob", state: "active" },
  }]);
  await action.execute({ code: "bob", email: "bob@example.com", firstName: "Bob" }, connected(ctx));
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/accounts");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.code, "bob");
  assertEquals(body.email, "bob@example.com");
  assertEquals(body.first_name, "Bob");
});

Deno.test("create-account: omits unset optional fields entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ code: "bob" }, connected(ctx));
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(Object.keys(body), ["code"]);
});

Deno.test("create-account: returns the created account", async () => {
  const created = { id: "a1", code: "bob", state: "active" };
  const { ctx } = mockCtx([{ status: 201, body: created }]);
  assertEquals(await action.execute({ code: "bob" }, connected(ctx)), created);
});
