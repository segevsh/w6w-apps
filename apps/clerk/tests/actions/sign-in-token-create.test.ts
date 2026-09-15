import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sign-in-token-create.ts";

Deno.test("sign-in-token-create: POSTs userId to /sign_in_tokens", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "sit_1", token: "tok_abc", url: "https://example.com/redeem" },
  }]);
  const out = await action.execute!({ userId: "user_1" }, ctx) as { token: string };
  assertEquals(new URL(calls[0].url).pathname, "/v1/sign_in_tokens");
  assertEquals(JSON.parse(calls[0].body!).user_id, "user_1");
  assertEquals(out.token, "tok_abc");
});

Deno.test("sign-in-token-create: requires a userId", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/userId/.test(String(err)));
  assertEquals(calls.length, 0);
});
