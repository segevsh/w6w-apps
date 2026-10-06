import { assertEquals, assertRejects } from "@std/assert";
import workorderCreate from "../../actions/workorder-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workorder-create: POST /v1/workorders with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 77 } }]);
  const out = await workorderCreate.execute({ title: "Leaking pump", priority: "HIGH" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/workorders");
  assertEquals(bodyOf(calls[0]), { title: "Leaking pump", priority: "HIGH" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, { id: 77 });
});

Deno.test("workorder-create: assignees become {type,id} pairs; emails stay strings", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await workorderCreate.execute({
    title: "T",
    assigneeUsers: "12, a@b.co",
    assigneeTeamIds: "3",
    categories: "Damage, Cleaning",
    vendorIds: "8",
    requesterId: "42",
    extraFields: '{"Shift":"Night"}',
    partsUsed: [{ partId: 1, quantityUsed: 2 }],
    estimatedTime: 3600,
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    title: "T",
    estimatedTime: 3600,
    categories: ["Damage", "Cleaning"],
    assignees: [
      { type: "USER", id: 12 },
      { type: "USER", id: "a@b.co" },
      { type: "TEAM", id: 3 },
    ],
    vendorIds: [8],
    requesterId: 42,
    extraFields: { Shift: "Night" },
    partsUsed: [{ partId: 1, quantityUsed: 2 }],
  });
});

Deno.test("workorder-create: invalid custom-field JSON fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(workorderCreate.execute({ title: "T", extraFields: "{x" }, ctx)),
    Error,
    "extraFields is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("workorder-create: is declared non-idempotent", () => {
  assertEquals(workorderCreate.idempotent, false);
});
