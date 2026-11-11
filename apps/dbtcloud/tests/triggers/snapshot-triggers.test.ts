import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newProject from "../../triggers/new-project.ts";
import newOrUpdatedProject from "../../triggers/new-or-updated-project.ts";
import newJob from "../../triggers/new-job.ts";
import newOrUpdatedJob from "../../triggers/new-or-updated-job.ts";
import newEnvironment from "../../triggers/new-environment.ts";
import newConnection from "../../triggers/new-connection.ts";
import newGroup from "../../triggers/new-group.ts";
import newServiceToken from "../../triggers/new-service-token.ts";
import newUser from "../../triggers/new-user.ts";
import newEnvironmentVariable from "../../triggers/new-environment-variable.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[]) => ({
  body: { data, extra: { pagination: { count: data.length, total_count: data.length } } },
});
const rec = (id: number) => ({ id, name: `n${id}`, updated_at: "2026-11-09 09:00:00+00:00" });

// The URL is a literal: the endpoint the wrapped list action calls, 100 rows a page from offset 0.
const cases = [
  {
    name: "new-project",
    t: newProject,
    params: {},
    url: "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/?limit=100&offset=0",
  },
  {
    name: "new-or-updated-project",
    t: newOrUpdatedProject,
    params: {},
    url: "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/?limit=100&offset=0",
  },
  {
    name: "new-job",
    t: newJob,
    params: { projectId: "101" },
    url:
      "https://ab123.us1.dbt.com/api/v2/accounts/42/jobs/?project_id=101&is_system=false&include_related=most_recent_run&limit=100&offset=0",
  },
  {
    name: "new-or-updated-job",
    t: newOrUpdatedJob,
    params: { projectId: "101" },
    url:
      "https://ab123.us1.dbt.com/api/v2/accounts/42/jobs/?project_id=101&is_system=false&include_related=most_recent_run&limit=100&offset=0",
  },
  {
    name: "new-environment",
    t: newEnvironment,
    params: { projectId: "101" },
    url:
      "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/101/environments/?limit=100&offset=0",
  },
  {
    name: "new-connection",
    t: newConnection,
    params: { projectId: "101" },
    url:
      "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/101/connections/?limit=100&offset=0",
  },
  {
    name: "new-group",
    t: newGroup,
    params: {},
    url: "https://ab123.us1.dbt.com/api/v3/accounts/42/groups/?limit=100&offset=0",
  },
  {
    name: "new-service-token",
    t: newServiceToken,
    params: {},
    url: "https://ab123.us1.dbt.com/api/v3/accounts/42/service-tokens/?limit=100&offset=0",
  },
  {
    name: "new-user",
    t: newUser,
    params: {},
    url: "https://ab123.us1.dbt.com/api/v3/accounts/42/users/?state=active&limit=100&offset=0",
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const input = (state: unknown) => ({ params: c.params, subscriptionId: "sub-1", state });
    const poll = c.t.poll!;

    test("seeds without emitting; sends the literal list request", async () => {
      const m = mockCtx([page([rec(1), rec(2)])], { display });
      const out = await poll(input({}), m.ctx);
      assertEquals(out.events, []);
      assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(m.calls.length, 1);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, c.url);
    });

    test("emits exactly the new record and is idempotent on retry", async () => {
      const seeded = await poll(input({}), mockCtx([page([rec(1), rec(2)])], { display }).ctx);
      const run = () =>
        poll(input(seeded.nextState), mockCtx([page([rec(1), rec(2), rec(3)])], { display }).ctx);
      const first = await run();
      assertEquals(first.events.map((e) => (e as { id: number }).id), [3]);
      assertEquals(await run(), first);
      const quiet = await poll(
        input(first.nextState),
        mockCtx([page([rec(1), rec(2), rec(3)])], { display }).ctx,
      );
      assertEquals(quiet.events, []);
    });
  });
}

describe("new-or-updated", () => {
  for (
    const [name, t, params] of [
      ["new-or-updated-project", newOrUpdatedProject, {}],
      ["new-or-updated-job", newOrUpdatedJob, { projectId: "101" }],
    ] as const
  ) {
    test(`${name}: an edited record (same id, new updated_at) is a new event`, async () => {
      const input = (state: unknown) => ({ params, subscriptionId: "s", state });
      const seeded = await t.poll!(input({}), mockCtx([page([rec(1)])], { display }).ctx);
      const edited = { ...rec(1), updated_at: "2026-11-10 10:00:00+00:00" };
      const out = await t.poll!(
        input(seeded.nextState),
        mockCtx([page([edited])], { display }).ctx,
      );
      assertEquals(out.events, [edited]);
    });
  }
  test("new-project: an edit is NOT an event", async () => {
    const input = (state: unknown) => ({ params: {}, subscriptionId: "s", state });
    const seeded = await newProject.poll!(input({}), mockCtx([page([rec(1)])], { display }).ctx);
    const edited = { ...rec(1), updated_at: "2026-11-10 10:00:00+00:00" };
    const out = await newProject.poll!(
      input(seeded.nextState),
      mockCtx([page([edited])], { display }).ctx,
    );
    assertEquals(out.events, []);
  });
});

describe("snapshot paging", () => {
  test("reads a second page (offset=100) before diffing", async () => {
    const full = Array.from({ length: 100 }, (_, i) => rec(i + 1));
    const m = mockCtx([
      { body: { data: full, extra: { pagination: { total_count: 101 } } } },
      { body: { data: [rec(101)], extra: { pagination: { total_count: 101 } } } },
    ], { display });
    const out = await newGroup.poll!({ params: {}, subscriptionId: "s", state: {} }, m.ctx);
    assertEquals(out.events, []);
    assertEquals(m.calls.map((c) => c.url), [
      "https://ab123.us1.dbt.com/api/v3/accounts/42/groups/?limit=100&offset=0",
      "https://ab123.us1.dbt.com/api/v3/accounts/42/groups/?limit=100&offset=100",
    ]);
  });

  test("refuses more than 5000 rows instead of truncating", async () => {
    const pages = Array.from({ length: 51 }, (_, p) => ({
      body: {
        data: Array.from({ length: 100 }, (_, i) => rec(p * 100 + i + 1)),
        extra: { pagination: { total_count: 5100 } },
      },
    }));
    await assertRejects(
      () =>
        newGroup.poll!(
          { params: {}, subscriptionId: "s", state: {} },
          mockCtx(pages, { display }).ctx,
        ),
      Error,
      "5000",
    );
  });
});

describe("new-environment-variable", () => {
  const body = (names: string[]) => ({
    body: {
      data: {
        environments: ["project", "Production"],
        variables: Object.fromEntries(names.map((n) => [n, { project: { value: "x" } }])),
      },
    },
  });
  const input = (state: unknown) => ({ params: { projectId: "101" }, subscriptionId: "s", state });

  test("seeds, emits the new name only (no value), retries idempotently, literal request", async () => {
    const seed = mockCtx([body(["A", "B"])], { display });
    const seeded = await newEnvironmentVariable.poll!(input({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(
      seed.calls[0].url,
      "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/101/environment-variables/environment/",
    );
    const run = () =>
      newEnvironmentVariable.poll!(
        input(seeded.nextState),
        mockCtx([body(["A", "B", "C"])], { display }).ctx,
      );
    const first = await run();
    assertEquals(first.events, [{ name: "C", environments: ["project"], secret: false }]);
    assertEquals(await run(), first);
  });
});
