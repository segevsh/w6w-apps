import { assert, assertEquals } from "@std/assert";
import customerEventsList from "../../actions/customer-events-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-events-list: GET /v1/src1/customers/o%201/events with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [] } }]);
  const out = await customerEventsList.execute({
    source_id: "src1",
    oid: "o 1",
    per_page: 5,
    page: 5,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/src1/customers/o%201/events");
  assertEquals(queryOf(calls[0].url), { per_page: "5", page: "5" });

  const bare = mockCtx([{ body: {} }]);
  await customerEventsList.execute({ source_id: "src1", oid: "o 1" }, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), {}, "unset optional params must not reach the query");
  assertEquals(calls[0].body, null);
  assert("events" in out);
});

Deno.test("customer-events-list: declares type search and every required param", () => {
  assertEquals(customerEventsList.type, "search");
  const required = (customerEventsList.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, ["oid", "source_id"]);
});

Deno.test("customer-events-list: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await customerEventsList.execute({ source_id: "src1", oid: "o 1", per_page: 5, page: 5 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
