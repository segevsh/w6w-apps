import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-screen.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-screen: PATCHes description and de-duplicated tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute(
    { projectId: "p1", screenId: "s1", description: "Login", tags: "a, b,a" },
    ctx,
  );
  assertEquals(out, { updated: true });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/projects/p1/screens/s1");
  assertEquals(JSON.parse(calls[0].body!), { description: "Login", tags: ["a", "b"] });
});

Deno.test("update-screen: an empty description may be sent to clear it; nothing set is refused", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ projectId: "p1", screenId: "s1", description: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { description: "" });
  await assertRejects(
    async () => await action.execute({ projectId: "p1", screenId: "s1" }, mockCtx().ctx),
    Error,
    "description or tags",
  );
});

Deno.test("update-screen: a 422 names the archived/membership cause", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "archived" } }]);
  await assertRejects(
    async () => await action.execute({ projectId: "p1", screenId: "s1", tags: "x" }, ctx),
    Error,
    "archived",
  );
});
