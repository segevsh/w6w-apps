import { assert, assertEquals, assertRejects } from "@std/assert";
import riskCreate from "../../actions/risk-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("risk-create: POST /risk-registers/{id}/risks wraps comma-separated ids as {id} objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 3, riskId: "RISK-003" } }]);
  const out = await riskCreate.execute({
    riskRegisterId: 2,
    title: "Unpatched hosts",
    description: "Hosts missing patches",
    impact: 6,
    likelihood: 4,
    ownerIds: "10, 11",
    controlIds: "7",
  }, ctx) as { riskId: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/v2/risk-registers/2/risks");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Unpatched hosts",
    description: "Hosts missing patches",
    impact: 6,
    likelihood: 4,
    owners: [{ id: 10 }, { id: 11 }],
    controls: [{ id: 7 }],
  });
  assertEquals(out.riskId, "RISK-003");
});

Deno.test("risk-create: a non-numeric id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () =>
      Promise.resolve().then(() =>
        riskCreate.execute(
          { riskRegisterId: 2, title: "t", description: "d", ownerIds: "abc" },
          ctx,
        )
      ),
    Error,
  );
  assert(err.message.includes("not a numeric id"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("risk-create: is non-idempotent", () => assertEquals(riskCreate.idempotent, false));

Deno.test("risk-create: a 400 surfaces Drata's message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody(400, "impact must not exceed 10", 2) }]);
  const err = await assertRejects(
    () =>
      Promise.resolve().then(() =>
        riskCreate.execute({ riskRegisterId: 2, title: "t", description: "d" }, ctx)
      ),
    Error,
  );
  assert(err.message.includes("impact must not exceed 10"), err.message);
});
