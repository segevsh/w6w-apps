import { assert, assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GET /v1/account with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { account: {} } }]);
  const out = await accountGet.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/account");
  assertEquals(calls[0].body, null);
  assert("account" in out);
});

Deno.test("account-get: declares type read and every required param", () => {
  assertEquals(accountGet.type, "read");
  const required = (accountGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
});

Deno.test("account-get: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await accountGet.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
