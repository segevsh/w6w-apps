import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/annotation-list.ts";

Deno.test("annotation-list: returns the annotations and their dates", async () => {
  const { ctx, calls } = mockCtx([
    ok({
      data: [
        { id: 1, date: "2026-08-14", label: "Release 1.4.0" },
        { id: 2, date: "2026-08-18", label: "Release 1.4.2" },
      ],
    }),
  ], { display });
  const result = await action.execute!({}, ctx) as { count: number; dates: string[] };
  assertEquals(new URL(calls[0].url).pathname, "/api/2/annotations");
  assertEquals(result.count, 2);
  assertEquals(result.dates, ["2026-08-14", "2026-08-18"]);
});

Deno.test("annotation-list: no annotations is a count of zero", async () => {
  const { ctx } = mockCtx([ok({ data: [] })], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("annotation-list: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
});

/** They are project-wide, not per-chart. */
Deno.test("annotation-list: says they appear on every chart", () => {
  assert(/project-wide/.test(action.description!), action.description);
});
