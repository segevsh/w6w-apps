import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  buildUrl,
  call,
  isAuthRejection,
  isFailureBody,
  Msg91Error,
  normalizeMobile,
  parseList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("normalizeMobile strips +, spaces and dashes; rejects non-numbers", () => {
  assertEquals(normalizeMobile("m", "+91 98765-43210"), "919876543210");
  assertThrows(() => normalizeMobile("m", "abc"));
  assertThrows(() => normalizeMobile("m", ""));
});

Deno.test("buildUrl drops blank query values", () => {
  const u = buildUrl("/x", { a: 1, b: "", c: undefined, d: "z" });
  assertEquals(u, "https://control.msg91.com/api/v5/x?a=1&d=z");
});

Deno.test("parseList accepts arrays, JSON text and comma text", () => {
  assertEquals(parseList("l", "a, b ,,c"), ["a", "b", "c"]);
  assertEquals(parseList("l", '["a","b"]'), ["a", "b"]);
  assertEquals(parseList("l", ["x", " y "]), ["x", "y"]);
  assertEquals(parseList("l", ""), []);
});

Deno.test("isFailureBody recognises both MSG91 error envelopes", () => {
  assert(isFailureBody({ type: "error", message: "x" }));
  assert(isFailureBody({ status: "fail", hasError: true, errors: "Unauthorized" }));
  assert(!isFailureBody({ type: "success", message: "ok" }));
  assert(!isFailureBody({ status: "success", hasError: false }));
});

Deno.test("isAuthRejection: code 201 or the vendor's wording", () => {
  assert(isAuthRejection({ message: "Invalid authkey", type: "error", code: "201" }));
  assert(isAuthRejection({ message: "Auth Key missing", type: "error" }));
  assert(isAuthRejection({ status: "fail", errors: "Unauthorized", apiError: "201" }));
  assert(!isAuthRejection({ message: "OTP not match", type: "error" }));
});

Deno.test("call: a 200 with type error is a failure carrying the vendor's message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(() => call(ctx, "GET", "/otp/verify")) as Msg91Error;
  assert(err instanceof Msg91Error);
  assertEquals(err.status, 200);
  assertEquals(err.vendorMessage, "Auth Key missing");
});

Deno.test("call: a 401 fail envelope is a failure", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: "fail", hasError: true, errors: "Unauthorized", code: "401" },
  }]);
  const err = await assertRejects(() => call(ctx, "POST", "/email/send", { body: {} })) as Error;
  assert(err.message.includes("401"));
  assert(err.message.includes("Unauthorized"));
});

Deno.test("call: sends JSON only when a body is given and never an authkey", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "success" } }, { body: { type: "success" } }]);
  await call(ctx, "GET", "/a");
  await call(ctx, "POST", "/b", { body: { k: 1 } });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"k":1}');
  for (const c of calls) assertEquals(c.headers.authkey, undefined);
});
