import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-create.ts";

const display = { organizationSlug: "acme" };

Deno.test("release-create: sends the version and the project list Sentry requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { version: "1.2.3" } }], { display });
  const result = await action.execute!({ version: "1.2.3", projects: "web, api" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/organizations/acme/releases/");
  assertEquals(JSON.parse(calls[0].body!), { version: "1.2.3", projects: ["web", "api"] });
  assertEquals(result, { version: "1.2.3" });
});

Deno.test("release-create: refs is parsed from JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display });
  await action.execute!({
    version: "1.2.3",
    projects: "web",
    refs: '[{"repository": "acme/web", "commit": "a1b2"}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).refs, [{ repository: "acme/web", commit: "a1b2" }]);
});

Deno.test("release-create: version, projects and valid refs are all enforced", async () => {
  const noVersion = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ projects: "web" }, noVersion.ctx),
    Error,
    "version",
  );
  const noProjects = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ version: "1.2.3" }, noProjects.ctx),
    Error,
    "projects",
  );
  const badRefs = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ version: "1.2.3", projects: "web", refs: "{oops" }, badRefs.ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(noVersion.calls.length + noProjects.calls.length + badRefs.calls.length, 0);
});
