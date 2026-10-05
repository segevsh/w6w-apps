import { assertEquals, assertRejects } from "@std/assert";
import verify from "../../actions/member-verify-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-verify-token: a valid token returns the decoded payload", async () => {
  const payload = { id: "mem_1", type: "member", aud: "app_x" };
  const { ctx, calls } = mockCtx([{ body: { data: payload } }]);
  const out = await verify.execute({ token: "jwt" }, ctx);
  assertEquals(pathOf(calls[0].url), "/members/verify-token");
  assertEquals(JSON.parse(calls[0].body!), { token: "jwt" });
  assertEquals(out, { valid: true, memberId: "mem_1", payload });
});

Deno.test("member-verify-token: INVALID_TOKEN is valid:false, not an error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Invalid token", "INVALID_TOKEN") }]);
  assertEquals(await verify.execute({ token: "bad" }, ctx), {
    valid: false,
    memberId: null,
    payload: null,
  });
});

Deno.test("member-verify-token: a rejected secret key still throws", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("The provided secret key is invalid.", "validation/invalid-secret-key"),
  }]);
  await assertRejects(
    () => Promise.resolve(verify.execute({ token: "x" }, ctx)),
    Error,
    "validation/invalid-secret-key",
  );
});

Deno.test("member-verify-token: a 429 throws rather than reading as an invalid token", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorBody("Too many requests") }]);
  await assertRejects(() => Promise.resolve(verify.execute({ token: "x" }, ctx)), Error, "429");
});
