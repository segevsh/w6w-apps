import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-get.ts";

const display = {};

Deno.test("deployment-get: accepts a hostname as well as an ID", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "dpl_1" } }], { display });
  await action.execute!({ idOrUrl: "my-app-abc.vercel.app" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v13/deployments/my-app-abc.vercel.app");
});

Deno.test("deployment-get: git repo info is opt-in", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }, { status: 200, body: {} }], {
    display,
  });
  await action.execute!({ idOrUrl: "dpl_1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("withGitRepoInfo"), null);
  await action.execute!({ idOrUrl: "dpl_1", withGitRepoInfo: true }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("withGitRepoInfo"), "true");
});

Deno.test("deployment-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`idOrUrl` is required");
  assertEquals(calls.length, 0);
});
