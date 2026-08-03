import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-get-many-all-forms.ts";

Deno.test("submission-get-many-all-forms: GETs /user/submissions with the resultSet", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([{ id: "237955080346633702", form_id: "31751954731962" }], {
        resultSet: { offset: 0, limit: 100, orderby: "id", count: 1 },
        "limit-left": 9991,
      }),
    },
  ]);
  const result = await action.execute({ filter: { formIDs: ["31751954731962"] } }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/user/submissions");
  assertEquals(url.searchParams.get("filter"), '{"formIDs":["31751954731962"]}');
  assertEquals(result, {
    items: [{ id: "237955080346633702", form_id: "31751954731962" }],
    resultSet: { offset: 0, limit: 100, orderby: "id", count: 1 },
    limitLeft: 9991,
  });
});

Deno.test("submission-get-many-all-forms: accepts a filter already serialised as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await action.execute({ filter: '{"fullText":"John Brown"}' }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    '{"fullText":"John Brown"}',
  );
});
