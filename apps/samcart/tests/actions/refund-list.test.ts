import { assertEquals, assertRejects } from "@std/assert";
import refundList from "../../actions/refund-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "offset": 100, "limit": 25, "dir": "prev" };
const RESPONSE = {
  "data": [{ "id": 1 }],
  "pagination": { "next": "https://api.samcart.com/v1/x?offset=99&dir=next", "prev": null },
};

Deno.test("refund-list: sends GET /v1/refunds with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await refundList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/refunds");
  assertEquals(queryOf(calls[0].url), { "offset": "100", "limit": "25", "dir": "prev" });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("refund-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: RESPONSE }]);
  assertEquals(await refundList.execute(INPUT, ctx), {
    "data": [{ "id": 1 }],
    "next": "https://api.samcart.com/v1/x?offset=99&dir=next",
    "prev": null,
    "nextOffset": "99",
  });
});

Deno.test("refund-list: an error surfaces SamCart's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Object could not be found" } }]);
  const err = await assertRejects(() => Promise.resolve(refundList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("Object could not be found"), true, err.message);
});
