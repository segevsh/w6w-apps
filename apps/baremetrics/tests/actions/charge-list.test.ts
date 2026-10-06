import { assert, assertEquals } from "@std/assert";
import chargeList from "../../actions/charge-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("charge-list: GET /v1/src1/charges with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { charges: [] } }]);
  const out = await chargeList.execute({
    source_id: "src1",
    start: 5,
    end: 5,
    customer_oid: "x1",
    subscription_oid: "x1",
    per_page: 5,
    page: 5,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/src1/charges");
  assertEquals(queryOf(calls[0].url), {
    start: "5",
    end: "5",
    customer_oid: "x1",
    subscription_oid: "x1",
    per_page: "5",
    page: "5",
  });

  const bare = mockCtx([{ body: {} }]);
  await chargeList.execute({ source_id: "src1" }, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), {}, "unset optional params must not reach the query");
  assertEquals(calls[0].body, null);
  assert("charges" in out);
});

Deno.test("charge-list: declares type search and every required param", () => {
  assertEquals(chargeList.type, "search");
  const required = (chargeList.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["source_id"]);
});

Deno.test("charge-list: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await chargeList.execute({
      source_id: "src1",
      start: 5,
      end: 5,
      customer_oid: "x1",
      subscription_oid: "x1",
      per_page: 5,
      page: 5,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
