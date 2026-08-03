import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-get-many.ts";

Deno.test("submission-get-many: GETs /form/{formID}/submissions with paging", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([{ id: "237955080346633702" }], { "limit-left": 9991 }) },
  ]);
  const result = await action.execute({
    formId: "31751954731962",
    offset: 100,
    limit: 100,
    orderby: "created_at",
    direction: "ASC",
    filter: { new: "1" },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/form/31751954731962/submissions");
  assertEquals(url.searchParams.get("offset"), "100");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("orderby"), "created_at");
  assertEquals(url.searchParams.get("direction"), "ASC");
  assertEquals(url.searchParams.get("filter"), '{"new":"1"}');
  assertEquals(result, {
    items: [{ id: "237955080346633702" }],
    resultSet: undefined,
    limitLeft: 9991,
  });
});

Deno.test("submission-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await action.execute({ formId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
