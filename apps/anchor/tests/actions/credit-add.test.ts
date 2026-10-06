import { assert, assertEquals } from "@std/assert";
import creditAdd from "../../actions/credit-add.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("credit-add: sends POST /billing/a1/credit", async () => {
  const { ctx, calls } = mockCtx([{ body: { "creditId": "cr1" } }]);
  const out = await creditAdd.execute(
    {
      "agreementId": "a1",
      "amount": "25.00",
      "serviceTemplateId": "s1",
      "note": "goodwill",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assert(calls[0].url.startsWith(API_ROOT));
  assertEquals(pathOf(calls[0].url), "/billing/a1/credit");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "amount": "25.00",
    "serviceTemplateId": "s1",
    "note": "goodwill",
  });
  // Credentials belong to `sign`, never to an action.
  assert(!("authorization" in calls[0].headers));
  assert(!("anchor-user-email" in calls[0].headers));
  assert(typeof out === "object" && out !== null);
  assertEquals(out.creditId, "cr1");
});

Deno.test("credit-add: a non-2xx answer throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: 403, error: "FORBIDDEN_USER" } }]);
  let message = "";
  try {
    await creditAdd.execute(
      {
        "agreementId": "a1",
        "amount": "25.00",
        "serviceTemplateId": "s1",
        "note": "goodwill",
      } as never,
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("403"), message);
  assert(message.includes("FORBIDDEN_USER"), message);
});
