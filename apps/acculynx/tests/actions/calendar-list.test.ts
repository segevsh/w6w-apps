import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/calendar-list.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("calendar-list: sends GET /calendars and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { count: 1, pageSize: 10, pageStartIndex: 0, items: [{ id: "cal1", name: "Main" }] },
  }]);
  const out = await action.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/calendars");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, {
    count: 1,
    pageSize: 10,
    pageStartIndex: 0,
    items: [{ id: "cal1", name: "Main" }],
  });
});

Deno.test("calendar-list: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({} as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
