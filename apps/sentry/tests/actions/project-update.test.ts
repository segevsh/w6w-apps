import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-update.ts";

const display = { organizationSlug: "acme" };

Deno.test("project-update: PUTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!(
    { projectSlug: "backend", name: "Backend", highlightTags: "url, env" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/projects/acme/backend/");
  assertEquals(JSON.parse(calls[0].body!), { name: "Backend", highlightTags: ["url", "env"] });
});

Deno.test("project-update: resolveAge 0 survives, because zero disables auto-resolution", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ projectSlug: "backend", resolveAge: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { resolveAge: 0 });
});

Deno.test("project-update: refuses a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ projectSlug: "backend" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
