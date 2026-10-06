import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-project.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("create-project: POSTs /v4/projects, parsing json params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 8 } } }]);
  const out = await exec(action, {
    name: "Website",
    customersId: 3,
    deadline: "2026-12-31",
    budget: '{"amount":100,"hard":true,"monetary":false}',
    serviceAssignments: [1, 2],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v4/projects`);
  assertEquals(bodyOf(calls[0]), {
    name: "Website",
    customers_id: 3,
    deadline: "2026-12-31",
    budget: { amount: 100, hard: true, monetary: false },
    service_assignments: [1, 2],
  });
  assertEquals(out, { data: { id: 8 } });
});

Deno.test("create-project: missing ids and a malformed budget are refused locally", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { name: "A" }, none.ctx), Error, "customersId");
  await assertRejects(
    () => exec(action, { name: "A", customersId: 1, budget: "{nope" }, none.ctx),
    Error,
    "not valid JSON",
  );
  await assertRejects(
    () => exec(action, { name: "A", customersId: 1, budget: "[1]" }, none.ctx),
    Error,
    "must be an object",
  );
  assertEquals(none.calls.length, 0);
});
