import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/survey-create.ts";

test("survey-create: POSTs /surveys with fields and merged definition", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "s1", title: "Survey" } }]);
  const result = await action.execute(
    {
      title: "Survey",
      folderId: "f1",
      fromTemplateId: "t1",
      footer: false,
      definition: { custom_variables: { foo: "bar" } },
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/surveys");
  assertEquals(JSON.parse(calls[0].body!), {
    custom_variables: { foo: "bar" },
    title: "Survey",
    folder_id: "f1",
    from_template_id: "t1",
    footer: false,
  });
  assertEquals(result, { id: "s1", title: "Survey" });
});

test("survey-create: sends an empty body when no fields are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
