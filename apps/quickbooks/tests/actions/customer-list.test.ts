import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/customer-list.ts";

Deno.test("customer-list: SELECTs from Customer with default pagination", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/company/123145/query");
  assertEquals(url.searchParams.get("query"), "SELECT * FROM Customer STARTPOSITION 1 MAXRESULTS 100");
});

Deno.test("customer-list: forwards where/orderBy/pagination", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await action.execute({
    where: "Active = true",
    orderBy: "DisplayName ASC",
    startPosition: 101,
    maxResults: 50,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.searchParams.get("query"),
    "SELECT * FROM Customer WHERE Active = true ORDERBY DisplayName ASC STARTPOSITION 101 MAXRESULTS 50",
  );
});
