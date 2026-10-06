import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/user-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("user-list: sends GET /users and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 1, pageSize: 10, pageStartIndex: 2, items: [{ id: "u1", status: "Active" }] },
  }]);
  const out = await action.execute({ status: "Active", startIndex: 2 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/users");
  assertEquals(queryOf(calls[0].url), { pageStartIndex: "2", status: "Active" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, {
    count: 1,
    pageSize: 10,
    pageStartIndex: 2,
    items: [{ id: "u1", status: "Active" }],
  });
});

Deno.test("user-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ status: "Active", startIndex: 2 } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
