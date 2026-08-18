import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: reads one project", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { key: "default" } }], {
    display: { projectKey: "default" },
  });
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.launchdarkly.com/api/v2/projects/default");
  assertEquals(result.key, "default");
});

Deno.test("project-get: with no project anywhere it says so before calling", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "no project");
  assertEquals(calls.length, 0);
});
