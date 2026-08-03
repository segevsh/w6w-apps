import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/form-get-many.ts";

Deno.test("form-get-many: GETs /user/forms passing every pagination param", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([{ id: "31504059977966" }], {
        resultSet: { offset: 0, limit: 20, count: 1 },
        "limit-left": 4900,
      }),
    },
  ]);
  const result = await action.execute({
    offset: 20,
    limit: 50,
    orderby: "created_at",
    direction: "DESC",
    filter: { "created_at:gt": "2013-01-01 00:00:00" },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/user/forms");
  assertEquals(url.searchParams.get("offset"), "20");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("orderby"), "created_at");
  assertEquals(url.searchParams.get("direction"), "DESC");
  assertEquals(
    url.searchParams.get("filter"),
    '{"created_at:gt":"2013-01-01 00:00:00"}',
  );
  assertEquals(result, {
    items: [{ id: "31504059977966" }],
    resultSet: { offset: 0, limit: 20, count: 1 },
    limitLeft: 4900,
  });
});

Deno.test("form-get-many: omits unset params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
