import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-list.ts";

const D = { display: { host: "https://api.airbyte.com" } };

Deno.test("workspace-list: reports a single workspace as the usual case", async () => {
  const { ctx, calls, logs } = mockCtx([{
    status: 200,
    body: { data: [{ workspaceId: "w1", name: "Default" }] },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/workspaces");
  assertEquals(result.single, true);
  assertEquals(logs.length, 0);
});

/** An application carries its creator's permissions, often broadly. */
Deno.test("workspace-list: notes when the application reaches several workspaces", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { data: [{ workspaceId: "w1" }, { workspaceId: "w2" }] },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.single, false);
  assert(
    logs.some((l) => /broader than a workflow needs/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("workspace-list: paging is clamped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], D);
  await action.execute({ limit: 9999 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "1000");
});
