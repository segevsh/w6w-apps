import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deploy-create.ts";

const display = { organizationSlug: "acme" };

Deno.test("deploy-create: records a deploy against the release", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "7" } }], { display });
  const result = await action.execute!({
    version: "1.2.3",
    environment: "production",
    projects: "web",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://us.sentry.io/api/0/organizations/acme/releases/1.2.3/deploys/",
  );
  assertEquals(JSON.parse(calls[0].body!), { environment: "production", projects: ["web"] });
  assertEquals(result, { id: "7" });
});

Deno.test("deploy-create: deploying twice is two deploys, so it is not idempotent", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("deploy-create: version and environment are both required", async () => {
  const noVersion = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ environment: "production" }, noVersion.ctx),
    Error,
    "version",
  );
  const noEnv = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ version: "1.2.3" }, noEnv.ctx),
    Error,
    "environment",
  );
  assertEquals(noVersion.calls.length + noEnv.calls.length, 0);
});
