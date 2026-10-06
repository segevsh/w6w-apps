import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/reverse-email-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("reverse-email-get: GETs by id and shapes the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "r1",
      name: "R",
      status: "FINISHED",
      cost: { credits: 1 },
      data: [{ profile: {} }],
    },
  }]);
  const out = await action.execute!({ enrichmentId: "r1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/contact/reverse/email/bulk/r1");
  assertEquals(out.status, "FINISHED");
  assertEquals(out.credits, 1);
});

Deno.test("reverse-email-get: documented 402 is a result, not an error", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { id: "r1", status: "CREDITS_INSUFFICIENT", data: [] },
  }]);
  const out = await action.execute!({ enrichmentId: "r1" }, ctx) as Record<string, unknown>;
  assertEquals(out.status, "CREDITS_INSUFFICIENT");
});

Deno.test("reverse-email-get: a 404 is thrown", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "error.reverse.email.not_found", message: "Reverse email ID not found" },
  }]);
  await assertRejects(
    async () => await action.execute!({ enrichmentId: "x" }, ctx),
    Error,
    "not_found",
  );
});
