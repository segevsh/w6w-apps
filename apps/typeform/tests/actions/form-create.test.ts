import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-create.ts";

Deno.test("form-create: POSTs /forms with the title and merged definition", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "abc", title: "Survey" } }]);
  const result = await action.execute(
    {
      title: "Survey",
      type: "quiz",
      workspaceHref: "https://api.typeform.com/workspaces/w1",
      definition: { fields: [{ title: "Q1", type: "short_text" }] },
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/forms");
  assertEquals(JSON.parse(calls[0].body!), {
    fields: [{ title: "Q1", type: "short_text" }],
    title: "Survey",
    type: "quiz",
    workspace: { href: "https://api.typeform.com/workspaces/w1" },
  });
  assertEquals(result, { id: "abc", title: "Survey" });
});

Deno.test("form-create: sends only the title when no extras are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ title: "Bare" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { title: "Bare" });
});
