import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/payment-list.ts";

Deno.test("payment-list: SELECTs from Payment", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "SELECT * FROM Payment STARTPOSITION 1 MAXRESULTS 100");
});
