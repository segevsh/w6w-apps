import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-enable.ts";

const BASE = { owner: "acme", repository: "api", workflowId: "ci.yml" };

test("workflow-enable: enabled:true hits /enable", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ ...BASE, enabled: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://api.github.com/repos/acme/api/actions/workflows/ci.yml/enable",
  );
});

test("workflow-enable: enabled:false hits /disable", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ ...BASE, enabled: false }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.github.com/repos/acme/api/actions/workflows/ci.yml/disable",
  );
});
