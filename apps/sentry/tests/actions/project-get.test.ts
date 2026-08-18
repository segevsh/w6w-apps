import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

const display = { organizationSlug: "acme" };

Deno.test("project-get: fetches one project", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { slug: "backend" } }], { display });
  const result = await action.execute!({ projectSlug: "backend" }, ctx);
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/projects/acme/backend/");
  assertEquals(result, { slug: "backend" });
});

Deno.test("project-get: a missing slug fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "`projectSlug` is required",
  );
  assertEquals(calls.length, 0);
});
