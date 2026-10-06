import { assertEquals } from "@std/assert";
import dealClose from "../../actions/deal-close.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-close: POST /v1/deals/{dealId}/close/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const result = await dealClose.execute({
    dealId: "5",
    value: "lost",
    amount: 1234.5,
    lostDealReason: 1,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/deals/5/close/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), {
    value: "lost",
    amount: 1234.5,
    lost_deal_reason: 1,
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { status: "ok" });
});

Deno.test("deal-close: declares type perform", () => {
  assertEquals(dealClose.type, "perform");
  assertEquals(dealClose.idempotent, true);
});

Deno.test("deal-close: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await dealClose.execute({ dealId: "5", value: "lost", amount: 1234.5, lostDealReason: 1 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
