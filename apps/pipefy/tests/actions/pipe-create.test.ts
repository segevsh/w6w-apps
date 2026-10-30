import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import pipeCreate from "../../actions/pipe-create.ts";

test("pipe-create: creates a pipe and returns it", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { createPipe: { pipe: { id: "1", name: "Sales" } } } },
  }]);
  const out = await pipeCreate.execute({ organizationId: "999", name: "Sales" }, ctx) as {
    id: string;
  };
  assertEquals(out.id, "1");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assertEquals(
    q,
    'mutation { createPipe(input: { name: "Sales", organization_id: 999 }) { pipe { id name } } }',
  );
});

test("pipe-create: type/resource/idempotency metadata", () => {
  assertEquals(pipeCreate.type, "perform");
  assertEquals(pipeCreate.resource, "pipe");
  assertEquals(pipeCreate.idempotent, false);
});
