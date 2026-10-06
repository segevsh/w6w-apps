import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/check-verification.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("check-verification: approved is flagged and the nested verification is returned", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        status: "approved",
        attempts_remaining: 0,
        verification: { id: "vrf_1", status: "verified" },
      },
    },
  }]);
  const out = await run(action, { verificationId: "vrf_1", code: "482916" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/verify/verifications/vrf_1/check");
  assertEquals(JSON.parse(calls[0].body!), { code: "482916" });
  assertEquals([out.status, out.approved, out.verification.status], ["approved", true, "verified"]);
});

Deno.test("check-verification: a wrong code is a normal result (200 incorrect), not an error", async () => {
  const { ctx } = mockCtx([{
    body: { data: { status: "incorrect", attempts_remaining: 2, verification: {} } },
  }]);
  const out = await run(action, { verificationId: "vrf_1", code: "000000" }, ctx);
  assertEquals([out.status, out.approved, out.attemptsRemaining], ["incorrect", false, 2]);
});

Deno.test("check-verification: a non-digit code fails locally; a malformed length is the vendor's 400", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { error: { message: "code must be 6 digits" } },
  }]);
  await assertRejects(
    () => run(action, { verificationId: "vrf_1", code: "12ab" }, ctx),
    Error,
    "digits only",
  );
  assertEquals(calls.length, 0);
  await assertRejects(
    () => run(action, { verificationId: "vrf_1", code: "123" }, ctx),
    Error,
    "6 digits",
  );
});
