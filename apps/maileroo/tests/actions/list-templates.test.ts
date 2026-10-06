import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-templates.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-templates: returns the array and passes the search", async () => {
  const rows = [{ id: 789, type: "html", template_name: "Welcome email" }];
  const { ctx, calls } = mockCtx([{ body: { data: rows } }]);
  const out = await run(action, { search: "Welc" }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/templates?search=Welc");
  assertEquals(out.templates, rows);
});

Deno.test("list-templates: a non-array payload is an empty list; errors throw", async () => {
  assertEquals((await run(action, {}, mockCtx([{ body: { data: null } }]).ctx)).templates, []);
  await assertRejects(
    () => run(action, {}, mockCtx([{ status: 403, body: { error: { message: "scope" } } }]).ctx),
    Error,
    "scope",
  );
});
