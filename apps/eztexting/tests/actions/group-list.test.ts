import { assertEquals } from "@std/assert";
import groupList from "../../actions/group-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("group-list: calls GET /contact-groups and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "3", name: "VIP" }]) }]);
  const result = await groupList.execute({ "name": "VIP", "page": 1 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contact-groups`);
  assertEquals(queryOf(calls[0].url), { "page": "1", "filters[name][like]": "VIP" });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "content": [{ "id": "3", "name": "VIP" }],
    "totalPages": 1,
    "totalElements": 1,
    "numberOfElements": 1,
  });
});

Deno.test("group-list: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "3", name: "VIP" }]) }]);
  await groupList.execute({ "name": "VIP", "page": 1 } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
