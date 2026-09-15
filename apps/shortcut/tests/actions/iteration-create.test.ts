import { assertEquals } from "@std/assert";
import iterationCreate from "../../actions/iteration-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/** `start_date`/`end_date` are plain dates, sent exactly as the caller typed them. */
Deno.test("iteration-create: posts name, start_date and end_date verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await iterationCreate.execute(
    { name: "Sprint 1", startDate: "2026-09-15", endDate: "2026-09-29" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v3/iterations");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Sprint 1",
    start_date: "2026-09-15",
    end_date: "2026-09-29",
  });
});
