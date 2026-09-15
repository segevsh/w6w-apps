import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import secretKey from "../../auth/secret-key.ts";

Deno.test("secret-key: sign injects the bearer prefix", async () => {
  const request = { headers: {} as Record<string, string> };
  const out = await secretKey.sign!(
    { request, credential: { secretKey: "sk_test_abc" } } as never,
    {} as never,
  );
  assertEquals(out.headers["authorization"], "Bearer sk_test_abc");
});

Deno.test("test: a live key reports ok without echoing it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const out = await secretKey.test!({ credential: { secretKey: "sk_test_abc" } } as never, ctx);
  assertEquals(out.ok, true);
  assert(!out.message?.includes("sk_test_abc"), out.message);
  assertEquals(new URL(calls[0].url).pathname, "/v1/users");
});

/** `clerk_key_invalid` names a bad key specifically, distinct from a malformed header. */
Deno.test("test: an invalid key is named by Clerk's own error code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errors: [{
        message: "The provided Clerk Secret Key is invalid.",
        long_message: "The provided Clerk Secret Key is invalid. Make sure that your Clerk " +
          "Secret Key is correct.",
        code: "clerk_key_invalid",
      }],
      clerk_trace_id: "abc",
    },
  }]);
  const out = await secretKey.test!({ credential: { secretKey: "sk_test_bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(!out.message?.includes("sk_test_bad"), out.message);
  assert(out.message!.includes("not one Clerk recognises"), out.message);
});

Deno.test("test: a credential with no secretKey fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await secretKey.test!({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});
