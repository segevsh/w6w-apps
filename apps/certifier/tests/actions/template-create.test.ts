import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/template-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-create: POST /v1/groups with name, ordered designIds and learning URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "g1" } }]);
  await action.execute(
    { name: " Course ", designIds: "d1, d2", learningEventUrl: "https://e.x" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/groups");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Course",
    designIds: ["d1", "d2"],
    learningEventUrl: "https://e.x",
  });
});

Deno.test("template-create: accepts a list and requires at least one design and a name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "g1" } }]);
  await action.execute({ name: "C", designIds: ["d1"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "C", designIds: ["d1"] });
  await assertRejects(
    async () => await action.execute({ name: "C", designIds: [] }, ctx),
    Error,
    "at least one",
  );
  await assertRejects(
    async () => await action.execute({ name: "", designIds: ["d"] }, ctx),
    Error,
    "name is required",
  );
});
