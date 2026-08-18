import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-create.ts";

const display = { teamId: "team_abc" };

Deno.test("deployment-create: POSTs the git source Vercel's schema expects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "dpl_1" } }], { display });
  const result = await action.execute!({
    name: "my-app",
    gitSource: '{"type":"github","repoId":123,"ref":"main"}',
    target: "production",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v13/deployments");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "my-app",
    gitSource: { type: "github", repoId: 123, ref: "main" },
    target: "production",
  });
  assertEquals(result, { id: "dpl_1" });
});

Deno.test('deployment-create: the two flag query params go as Vercel\'s literal "1"', async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({
    name: "my-app",
    forceNew: true,
    skipAutoDetectionConfirmation: true,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("forceNew"), "1");
  assertEquals(q.get("skipAutoDetectionConfirmation"), "1");
});

Deno.test("deployment-create: a name is required and bad JSON is named", async () => {
  const noName = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ name: " " }, noName.ctx),
    Error,
    "`name`",
  );
  const badJson = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ name: "x", gitSource: "{oops" }, badJson.ctx),
    Error,
    "gitSource",
  );
  assertEquals(noName.calls.length + badJson.calls.length, 0);
});

Deno.test("deployment-create: is honestly non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
