import { assert, assertEquals } from "@std/assert";
import chargesSubmit from "../../actions/charges-submit.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("charges-submit: sends POST /billing/a1/submit", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "adHocChargesIds": ["x"], "serviceBillCommandsIds": [] },
  }]);
  const out = await chargesSubmit.execute(
    {
      "agreementId": "a1",
      "billingDetails": { "type": "bill_now", "issueDate": "2026-10-06" },
      "outOfScopeCharges": '[{"serviceTemplateId":"s1"}]',
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/billing/a1/submit");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "billingDetails": { "type": "bill_now", "issueDate": "2026-10-06" },
    "outOfScopeCharges": [{ "serviceTemplateId": "s1" }],
  });
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.adHocChargesIds, ["x"]);
});

Deno.test("charges-submit: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await chargesSubmit.execute(
      {
        "agreementId": "a1",
        "billingDetails": { "type": "bill_now", "issueDate": "2026-10-06" },
        "outOfScopeCharges": '[{"serviceTemplateId":"s1"}]',
      } as never,
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});

Deno.test("charges-submit: billingDetails is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let failed = false;
  try {
    await chargesSubmit.execute({ agreementId: "a1" } as never, ctx);
  } catch {
    failed = true;
  }
  assert(failed);
  assertEquals(calls.length, 0);
});
