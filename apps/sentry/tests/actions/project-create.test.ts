import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

const display = { organizationSlug: "acme" };

Deno.test("project-create: POSTs to the org's project collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { slug: "new-svc" } }], { display });
  const result = await action.execute!({ name: "New Svc", platform: "node" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/organizations/acme/projects/");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Svc", platform: "node" });
  assertEquals(result, { slug: "new-svc" });
});

Deno.test("project-create: defaultRules maps to Sentry's snake_case field", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display });
  await action.execute!({ name: "Svc", defaultRules: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Svc", default_rules: false });
});

Deno.test("project-create: is honestly non-idempotent and needs a name", async () => {
  assertEquals(action.idempotent, false);
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ name: " " }, ctx),
    Error,
    "`name` is required",
  );
  assertEquals(calls.length, 0);
});
