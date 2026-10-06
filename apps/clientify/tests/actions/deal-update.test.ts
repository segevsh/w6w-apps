import { assertEquals } from "@std/assert";
import dealUpdate from "../../actions/deal-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-update: PATCH /v1/deals/{dealId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5 } }]);
  const result = await dealUpdate.execute({ dealId: "5", dealSource: "Email" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/deals/5/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), { deal_source: "Email" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { id: 5 });
});

Deno.test("deal-update: declares type perform", () => {
  assertEquals(dealUpdate.type, "perform");
  assertEquals(dealUpdate.idempotent, true);
});

Deno.test("deal-update: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await dealUpdate.execute({ dealId: "5", dealSource: "Email" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
