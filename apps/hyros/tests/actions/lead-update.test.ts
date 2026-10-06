import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, OK, pathOf, queryOf } from "../_helpers.ts";
import leadUpdate from "../../actions/lead-update.ts";

Deno.test("lead-update: PUT /leads with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await leadUpdate.execute({
    findEmail: "j@x.io",
    lastName: "D",
    stageName: "SQL",
    stageDate: "2026-01-01",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/leads");
  assertEquals(JSON.parse(calls[0].body!), {
    lastName: "D",
    leadStage: { name: "SQL", date: "2026-01-01" },
  });
  assertEquals(out, { requestId: "req1", result: "OK" });
});

Deno.test("lead-update: finders go in the query, not the body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await leadUpdate.execute({ findEmail: "j@x.io", findId: "L1", findPhone: "5" }, ctx);
  assertEquals(queryOf(calls[0].url), { email: "j@x.io", id: "L1", phone: "5" });
});

Deno.test("lead-update: refuses without a finder", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await leadUpdate.execute({ firstName: "x" }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
