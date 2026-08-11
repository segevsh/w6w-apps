import { assert, assertEquals } from "@std/assert";
import action from "../../actions/member-activity-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("member-activity-list: GETs the analytics path", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ memberId: "m-1" }]) }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/analytics/member-activities");
  assertEquals(out.items.length, 1);
});

/** These are the only plain `format: date` parameters in v2. */
Deno.test("member-activity-list: the date bounds are dates, not timestamps", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ dateFrom: "2026-01-01", dateTo: "2026-02-01", pageCursor: "c" }, ctx);
  assertEquals(queryOf(calls[0].url), {
    dateFrom: "2026-01-01",
    dateTo: "2026-02-01",
    pageCursor: "c",
  });
  assertEquals(action.params?.find((p) => p.key === "dateFrom")?.type, "date");
});

Deno.test("member-activity-list: names its separate scope, so a 403 reads as a scope problem", () => {
  assert(action.description!.includes("analytics:read"), action.description!);
});
