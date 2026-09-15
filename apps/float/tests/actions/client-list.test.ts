import { assertEquals } from "@std/assert";
import clientList from "../../actions/client-list.ts";
import { asListResult, mockCtx, paginationHeaders, pathOf } from "../_helpers.ts";

Deno.test("client-list - GETs /clients", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ client_id: 1, name: "Red Circle" }],
    headers: paginationHeaders(),
  }]);
  const out = asListResult(await clientList.execute({ page: 1, "per-page": 20 }, ctx));
  assertEquals(pathOf(calls[0].url), "/v3/clients");
  assertEquals(out.items, [{ client_id: 1, name: "Red Circle" }]);
});
