import { assert, assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-list: GET /v1/src1/customers with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [] } }]);
  const out = await customerList.execute({
    source_id: "src1",
    search: "x1",
    sort: "ltv",
    order: "desc",
    per_page: 5,
    page: 5,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/src1/customers");
  assertEquals(queryOf(calls[0].url), {
    search: "x1",
    sort: "ltv",
    order: "desc",
    per_page: "5",
    page: "5",
  });

  const bare = mockCtx([{ body: {} }]);
  await customerList.execute({ source_id: "src1" }, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), {}, "unset optional params must not reach the query");
  assertEquals(calls[0].body, null);
  assert("customers" in out);
});

Deno.test("customer-list: declares type search and every required param", () => {
  assertEquals(customerList.type, "search");
  const required = (customerList.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["source_id"]);
});

Deno.test("customer-list: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await customerList.execute({
      source_id: "src1",
      search: "x1",
      sort: "ltv",
      order: "desc",
      per_page: 5,
      page: 5,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
