import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/lead-source-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("lead-source-list: sends GET /company-settings/leads/lead-sources and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 1, pageSize: 50, pageStartIndex: 0, items: [{ id: "ls1", name: "Web" }] },
  }]);
  const out = await action.execute({ pageSize: 50 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/company-settings/leads/lead-sources");
  assertEquals(queryOf(calls[0].url), { pageSize: "50" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, {
    count: 1,
    pageSize: 50,
    pageStartIndex: 0,
    items: [{ id: "ls1", name: "Web" }],
  });
});

Deno.test("lead-source-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({ pageSize: 50 } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
