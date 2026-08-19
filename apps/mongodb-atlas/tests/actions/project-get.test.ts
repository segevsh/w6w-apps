import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

const project = {
  status: 200,
  body: {
    id: "5f8d0d55b54eff0f2b2c3d4e",
    name: "production",
    orgId: "org-1",
    clusterCount: 3,
    created: "2026-01-01T00:00:00Z",
  },
};

Deno.test("project-get: reads one project by id", async () => {
  const { ctx, calls } = mockCtx([project]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(
    calls[0].url,
    "https://cloud.mongodb.com/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e",
  );
  assertEquals(result.name, "production");
  assertEquals(result.clusterCount, 3);
  assertEquals(result.orgId, "org-1");
});

/** Atlas validates ids after authorisation, so a typo would look like a 401. */
Deno.test("project-get: a malformed id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ projectId: "production" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/24-character hex project id/.test(message), message);
  assertEquals(calls.length, 0);
  assert(/401 rather than 400/.test(action.description!), action.description);
});

Deno.test("project-get: a missing id is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/required/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("project-get: a project outside this account's reach surfaces the error", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "not authorized", errorCode: "X" } }]);
  let message = "";
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/per PROJECT as well as per organisation/.test(message), message);
});

Deno.test("project-get: a sparse response does not throw", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.clusterCount, undefined);
});
