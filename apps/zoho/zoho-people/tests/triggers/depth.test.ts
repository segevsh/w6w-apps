import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockPeopleCtx } from "../_helpers.ts";
import newProject from "../../triggers/new-project.ts";
import newJob from "../../triggers/new-job.ts";

const base = { subscriptionId: "sub-1" };
const wrap = (rows: unknown[]) => ({
  body: { response: { result: rows, message: "Data fetched successfully", status: 0 } },
});

const cases = [
  {
    name: "new-project",
    // deno-lint-ignore no-explicit-any
    trigger: newProject as any,
    params: {},
    path: "/people/api/timetracker/getprojects",
    query: { assignedTo: "all", sIndex: "0", limit: "200" },
    idKey: "projectId",
  },
  {
    name: "new-job",
    // deno-lint-ignore no-explicit-any
    trigger: newJob as any,
    params: { assignedTo: "all" },
    path: "/people/api/timetracker/getjobs",
    query: { assignedTo: "all", sIndex: "0", limit: "200" },
    idKey: "jobId",
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const input = (state: unknown) => ({ ...base, params: c.params, state });
    const row = (id: string) => ({ [c.idKey]: id });

    test("seeds without emitting and sends the literal request", async () => {
      const m = mockPeopleCtx([wrap([row("1")])]);
      const seeded = await c.trigger.poll!(input({}), m.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seeded.nextState.seeded, true);
      assertEquals(m.calls[0].method, "GET");
      const url = new URL(m.calls[0].url);
      assertEquals(url.pathname, c.path);
      assertEquals(Object.fromEntries(url.searchParams), c.query);
    });

    test("emits only the added row; a retry is identical", async () => {
      const seeded = await c.trigger.poll!(input({}), mockPeopleCtx([wrap([row("1")])]).ctx);
      const responses = () => [wrap([row("1"), row("2")])];
      const one = await c.trigger.poll!(input(seeded.nextState), mockPeopleCtx(responses()).ctx);
      const two = await c.trigger.poll!(input(seeded.nextState), mockPeopleCtx(responses()).ctx);
      assertEquals(one.events, [row("2")]);
      assertEquals(one, two);
    });

    test("a full page of 200 rows is refused rather than watched truncated", async () => {
      const rows = Array.from({ length: 200 }, (_, i) => row(String(i)));
      await assertRejects(
        () => c.trigger.poll!(input({}), mockPeopleCtx([wrap(rows)]).ctx),
        Error,
        "too many to watch",
      );
    });
  });
}
