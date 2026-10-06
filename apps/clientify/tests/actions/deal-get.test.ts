import { assertEquals } from "@std/assert";
import dealGet from "../../actions/deal-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-get: GET /v1/deals/{dealId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5, name: "Renewal" } }]);
  const result = await dealGet.execute({ dealId: "5" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/deals/5/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, { id: 5, name: "Renewal" });
});

Deno.test("deal-get: declares type read", () => {
  assertEquals(dealGet.type, "read");
});

Deno.test("deal-get: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await dealGet.execute({ dealId: "5" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
