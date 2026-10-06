import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/otp-verify.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { mobile: "+919876543210", otp: "1234" };

Deno.test("otp-verify: GET /otp/verify and a success body is verified true", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "success", message: "OTP verified success" } }]);
  const out = await action.execute(INPUT, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v5/otp/verify");
  assertEquals(queryOf(calls[0].url), { mobile: "919876543210", otp: "1234" });
  assertEquals(out, { verified: true, message: "OTP verified success" });
});

Deno.test("otp-verify: a wrong or expired OTP is a result, not an error", async () => {
  for (const message of ["OTP not match", "OTP expired"]) {
    const { ctx } = mockCtx([{ body: { type: "error", message } }]);
    assertEquals(await action.execute(INPUT, ctx), { verified: false, message });
  }
});

Deno.test("otp-verify: a rejected key still fails the step", async () => {
  const { ctx } = mockCtx([{ body: { message: "Invalid authkey", type: "error", code: "201" } }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("Invalid authkey"));
});

Deno.test("otp-verify: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "success", message: "OTP verified success" } }]);
  await action.execute({ mobile: "919876543210", otp: "1234" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("otp-verify: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ mobile: "919876543210", otp: "1234" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
