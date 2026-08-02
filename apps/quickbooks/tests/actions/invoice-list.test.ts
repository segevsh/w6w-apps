import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: SELECTs from Invoice with default pagination", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "SELECT * FROM Invoice STARTPOSITION 1 MAXRESULTS 100");
});

Deno.test("invoice-list: forwards where/orderBy/pagination", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({ where: "Balance > '0'", maxResults: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.searchParams.get("query"),
    "SELECT * FROM Invoice WHERE Balance > '0' STARTPOSITION 1 MAXRESULTS 25",
  );
});
