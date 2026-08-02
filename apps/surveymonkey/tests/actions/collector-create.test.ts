import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collector-create.ts";

Deno.test("collector-create: POSTs /surveys/{id}/collectors with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1", type: "weblink" } }]);
  const result = await action.execute(
    {
      surveyId: "s1",
      type: "weblink",
      name: "Main link",
      allowMultipleResponses: true,
      anonymousType: "fully_anonymous",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/surveys/s1/collectors");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "weblink",
    name: "Main link",
    allow_multiple_responses: true,
    anonymous_type: "fully_anonymous",
  });
  assertEquals(result, { id: "c1", type: "weblink" });
});

Deno.test("collector-create: sends only the type when no extras are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ surveyId: "s1", type: "email" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { type: "email" });
});
