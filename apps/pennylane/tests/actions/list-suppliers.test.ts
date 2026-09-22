import { assert, assertEquals } from "@std/assert";
import { mockCtx, rejection } from "../_helpers.ts";
import action from "../../actions/list-suppliers.ts";

const PAGE = { items: [{ id: 3, name: "Papeterie SARL" }], has_more: false, next_cursor: null };

Deno.test("list-suppliers: GETs /suppliers and returns the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/suppliers");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(res, PAGE);
});

Deno.test("list-suppliers: carries cursor, limit and filter", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({
    cursor: "eyJpZCI6MTAwfQ==",
    limit: 10,
    filter: [{ field: "name", operator: "start_with", value: "Pap" }],
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("cursor"), "eyJpZCI6MTAwfQ==");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(
    url.searchParams.get("filter"),
    '[{"field":"name","operator":"start_with","value":"Pap"}]',
  );
});

Deno.test("list-suppliers: a filter the vendor rejects is re-thrown, not swallowed", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "bad_request", message: "Invalid filter operator" },
  }]);
  const err = await rejection(action.execute({ filter: "nonsense" }, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("Invalid filter operator"), err.message);
});
