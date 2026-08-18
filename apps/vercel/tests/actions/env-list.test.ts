import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/env-list.ts";

Deno.test("env-list: decrypt is off by default — secrets are not pulled into step output", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { envs: [] } }], { display: {} });
  await action.execute!({ projectId: "my-app" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v10/projects/my-app/env");
  assertEquals(new URL(calls[0].url).searchParams.get("decrypt"), null);
});

Deno.test("env-list: decrypt and gitBranch reach the wire as Vercel's strings", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await action.execute!({ projectId: "my-app", decrypt: true, gitBranch: "main" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("decrypt"), "true");
  assertEquals(q.get("gitBranch"), "main");
});

Deno.test("env-list: a blank project fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`projectId`");
  assertEquals(calls.length, 0);
});
