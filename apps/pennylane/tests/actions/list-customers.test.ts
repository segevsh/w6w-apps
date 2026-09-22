import { assert, assertEquals } from "@std/assert";
import { mockCtx, rejection } from "../_helpers.ts";
import action from "../../actions/list-customers.ts";

const PAGE = {
  items: [{ id: 42, name: "Acme", customer_type: "company" }],
  has_more: true,
  next_cursor: "dXBkYXRlZF9hdDoxNjc0MTIzNDU2",
};

Deno.test("list-customers: GETs /customers and returns the vendor's cursor envelope whole", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/external/v2/customers");
  assertEquals(url.search, "", "an untouched form must not add query parameters");
  assertEquals(res, PAGE);
});

Deno.test("list-customers: serializes cursor, limit and sort", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({ cursor: "abc", limit: 50, sort: "-id" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("cursor"), "abc");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("sort"), "-id");
});

Deno.test("list-customers: JSON-encodes a structured filter and passes a string through", async () => {
  const structured = mockCtx([{ body: PAGE }]);
  await action.execute({
    filter: [{ field: "name", operator: "eq", value: "Acme" }],
  }, structured.ctx);
  assertEquals(
    new URL(structured.calls[0].url).searchParams.get("filter"),
    '[{"field":"name","operator":"eq","value":"Acme"}]',
  );

  const raw = mockCtx([{ body: PAGE }]);
  await action.execute({ filter: '[{"field":"id","operator":"eq","value":1}]' }, raw.ctx);
  assertEquals(
    new URL(raw.calls[0].url).searchParams.get("filter"),
    '[{"field":"id","operator":"eq","value":1}]',
  );
});

Deno.test("list-customers: a 403 surfaces the vendor's own error code and message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: "forbidden", message: "Missing scope: customers:readonly" },
  }]);
  const err = await rejection(action.execute({}, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("Pennylane 403"), err.message);
  assert(err.message.includes("forbidden"), err.message);
  assert(err.message.includes("Missing scope: customers:readonly"), err.message);
});
