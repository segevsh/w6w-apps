import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/otp-send.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("otp-send: POST /otp with template, mobile and options in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "success", request_id: "34676b6d" } }]);
  const out = await action.execute({
    templateId: "otpt",
    mobile: "+91 98765 43210",
    otp: "1234",
    otpLength: 6,
    otpExpiry: 5,
    unicode: false,
    invisible: true,
    realTimeResponse: true,
    variables: { Param1: "v" },
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v5/otp");
  assertEquals(queryOf(calls[0].url), {
    template_id: "otpt",
    mobile: "919876543210",
    otp: "1234",
    otp_length: "6",
    otp_expiry: "5",
    unicode: "0",
    invisible: "1",
    realTimeResponse: "1",
  });
  assertEquals(jsonBody(calls[0]), { Param1: "v" });
  assertEquals(out, { requestId: "34676b6d" });
});

Deno.test("otp-send: omits unset options and sends an empty JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "success", request_id: "r" } }]);
  await action.execute({ templateId: "t", mobile: "919876543210" }, ctx);
  assertEquals(queryOf(calls[0].url), { template_id: "t", mobile: "919876543210" });
  assertEquals(jsonBody(calls[0]), {});
});

Deno.test("otp-send: a bad template is a failure even though HTTP is 200", async () => {
  const { ctx } = mockCtx([{
    body: { type: "error", message: "The provided flow ID or template ID is invalid." },
  }]);
  const err = await assertRejects(async () =>
    await action.execute({ templateId: "x", mobile: "919876543210" }, ctx)
  ) as Error;
  assert(err.message.includes("template ID is invalid"));
});

Deno.test("otp-send: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "success", request_id: "34676b" } }]);
  await action.execute({ templateId: "otpt", mobile: "919876543210" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("otp-send: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ templateId: "otpt", mobile: "919876543210" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
