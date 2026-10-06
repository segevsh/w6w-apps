import { assertEquals } from "@std/assert";
import clientList from "../../actions/client-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-list: GET /client/list with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const out = await clientList.execute({ "currentPage": 1 } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/client/list");
  assertEquals(queryOf(calls[0].url), { "current_page": "1" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("client-list: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await clientList.execute({ "currentPage": 1 } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
