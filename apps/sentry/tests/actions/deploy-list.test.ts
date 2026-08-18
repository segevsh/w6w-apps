import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deploy-list.ts";

const display = { organizationSlug: "acme" };

Deno.test("deploy-list: lists a release's deploys", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ id: "1", environment: "production" }] }],
    {
      display,
    },
  );
  const result = await action.execute!({ version: "1.2.3" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/0/organizations/acme/releases/1.2.3/deploys/",
  );
  assertEquals(result, [{ id: "1", environment: "production" }]);
});

Deno.test("deploy-list: a blank version fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`version` is required");
  assertEquals(calls.length, 0);
});
