import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-update.ts";

const RESPONSE = { "success": true, "data": { "listId": "3", "name": "Renamed" } };

Deno.test("list-update: calls PUT /api/client/v2/lists/{id} and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({ "id": "3", "name": "Renamed" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/lists/3");
  assertEquals(calls[0].method, "PUT");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "name": "Renamed" });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("list-update: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "id": "3", "name": "Renamed" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "name": "Renamed" });
});

Deno.test("list-update: refuses a missing id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ "name": "Renamed" } as never, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("list-update: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "id": "3", "name": "Renamed" }, ctx),
    Error,
    "insufficientCredits",
  );
});
