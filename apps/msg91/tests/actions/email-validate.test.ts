import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/email-validate.ts";
import { jsonBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-validate: POST /email/validate and flattens the verdict", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      data: {
        email: "a@b.com",
        result: {
          valid: true,
          result: "deliverable",
          reason: null,
          is_disposable: false,
          is_free: true,
          is_role: false,
        },
      },
      hasError: false,
      errors: {},
    },
  }]);
  const out = await action.execute({ email: "a@b.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v5/email/validate");
  assertEquals(jsonBody(calls[0]), { email: "a@b.com" });
  assertEquals(out, {
    valid: true,
    result: "deliverable",
    reason: null,
    isDisposable: false,
    isFree: true,
    isRole: false,
  });
});

Deno.test("email-validate: requires an address", async () => {
  await assertRejects(async () => await action.execute({}, mockCtx([]).ctx));
});

Deno.test("email-validate: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", data: { result: { valid: true } } },
  }]);
  await action.execute({ email: "a@b.com" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("email-validate: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ email: "a@b.com" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
