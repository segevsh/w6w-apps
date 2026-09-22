import { assertEquals } from "@std/assert";
import jobList from "../../actions/job-list.ts";
import { mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("job-list: calls GET /job/all/ with the same filters as /lead/all/", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ UUID: "j1" }] }]);
  const out = await jobList.execute({ start_date: "2026-09-01", only_open: false }, ctx);

  assertEquals(pathOf(calls[0].url), "/job/all/");
  assertEquals(queryOf(calls[0].url), { start_date: "2026-09-01", only_open: "false" });
  assertEquals(out.items, [{ UUID: "j1" }]);
});

/**
 * The vendor's spec documents two readings of this response and does not
 * disambiguate them, so the action must handle both.
 */
Deno.test("job-list: accepts wrapped rows as well as flat ones", async () => {
  const wrapped = mockCtx([{ body: [{ flag: true, data: { UUID: "j1" } }] }]);
  assertEquals((await jobList.execute({}, wrapped.ctx)).items, [{ UUID: "j1" }]);

  const flat = mockCtx([{ body: [{ UUID: "j2" }] }]);
  assertEquals((await jobList.execute({}, flat.ctx)).items, [{ UUID: "j2" }]);
});

Deno.test("job-list: status is sent as a repeated query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await jobList.execute({ status: ["Scheduled", "Done"] }, ctx);
  assertEquals(queryAll(calls[0].url), { status: ["Scheduled", "Done"] });
});

Deno.test("job-list: an empty body is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals((await jobList.execute({}, ctx)).items, []);
});
