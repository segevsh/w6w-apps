import { afterEach, describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, problemBody } from "../_helpers.ts";
import newAppointment from "../../triggers/new-appointment.ts";
import newJobEstimate from "../../triggers/new-job-estimate.ts";
import newJobRepresentative from "../../triggers/new-job-representative.ts";
import newUser from "../../triggers/new-user.ts";
import { MAX_PAGES, PAGE_SIZE } from "../../lib/triggers.ts";

const root = "https://api.acculynx.com/api/v2";
const rows = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `r-${from + i}` }));
const page = (items: unknown[], count: number) => ({ count, pageSize: 25, items });

const cases = [
  {
    key: "new-job-estimate",
    trigger: newJobEstimate,
    params: { jobId: "job-1" },
    url: (start: number) => `${root}/jobs/job-1/estimates?pageSize=25&recordStartIndex=${start}`,
  },
  {
    key: "new-job-representative",
    trigger: newJobRepresentative,
    params: { jobId: "job-1" },
    url: (start: number) =>
      `${root}/jobs/job-1/representatives?pageSize=25&recordStartIndex=${start}`,
  },
  {
    key: "new-user",
    trigger: newUser,
    params: {},
    url: (start: number) => `${root}/users?pageSize=25&pageStartIndex=${start}`,
  },
];

for (const c of cases) {
  describe(c.key, () => {
    test("seeds, emits only the new record, retries identically, makes the literal request", async () => {
      const input = { params: c.params, subscriptionId: "sub-1" };
      const seed = mockCtx([{ body: page([{ id: "one" }], 1) }]);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url(0));
      assertEquals(seed.calls[0].body, null);

      const body = page([{ id: "one" }, { id: "two" }], 2);
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body }]).ctx,
      );
      const retry = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body }]).ctx,
      );
      assertEquals(first.events, [{ id: "two" }]);
      assertEquals(retry, first);
    });

    test("reads every page: a record on page 2 is seen, and nothing re-fires", async () => {
      const input = { params: c.params, subscriptionId: "sub-1" };
      const all = rows(0, 30);
      const seed = mockCtx([{ body: page(all.slice(0, 25), 30) }, {
        body: page(all.slice(25), 30),
      }]);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seed.calls.map((x) => x.url), [c.url(0), c.url(25)]);
      assertEquals(seeded.events, []);

      const quiet = mockCtx([{ body: page(all.slice(0, 25), 30) }, {
        body: page(all.slice(25), 30),
      }]);
      assertEquals(
        (await c.trigger.poll!({ ...input, state: seeded.nextState }, quiet.ctx)).events,
        [],
      );

      const more = [...all, { id: "r-30" }];
      const grew = mockCtx([{ body: page(more.slice(0, 25), 31) }, {
        body: page(more.slice(25), 31),
      }]);
      assertEquals(
        (await c.trigger.poll!({ ...input, state: seeded.nextState }, grew.ctx)).events,
        [{ id: "r-30" }],
      );
    });

    test(`refuses a collection past ${MAX_PAGES * PAGE_SIZE} records`, async () => {
      const total = MAX_PAGES * PAGE_SIZE + 1;
      const pages = Array.from({ length: MAX_PAGES }, (_, i) => ({
        body: page(rows(i * PAGE_SIZE, PAGE_SIZE), total),
      }));
      const { ctx, calls } = mockCtx(pages);
      await assertRejects(
        async () =>
          await c.trigger.poll!({ params: c.params, subscriptionId: "s", state: {} }, ctx),
        Error,
        "more than 500 records",
      );
      assertEquals(calls.length, MAX_PAGES);
    });
  });
}

test("a job with no estimates (416 on the first page) is an empty list, not an error", async () => {
  const { ctx } = mockCtx([{ status: 416, body: { message: "Range Not Satisfiable" } }]);
  const out = await newJobEstimate.poll!(
    { params: { jobId: "job-1" }, subscriptionId: "s", state: {} },
    ctx,
  );
  assertEquals(out.events, []);
  assertEquals((out.nextState as { hashes: object }).hashes, {});
});

test("a 416 after the first page is still an error", async () => {
  const { ctx } = mockCtx([
    { body: page(rows(0, 25), 40) },
    { status: 416, body: { message: "Range Not Satisfiable" } },
  ]);
  await assertRejects(
    async () =>
      await newJobEstimate.poll!({ params: { jobId: "j" }, subscriptionId: "s", state: {} }, ctx),
    Error,
    "AccuLynx 416",
  );
});

test("another vendor error on the first page surfaces", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await newJobRepresentative.poll!(
        { params: { jobId: "j" }, subscriptionId: "s", state: {} },
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});

describe("new-appointment", () => {
  const realNow = Date.now;
  afterEach(() => {
    Date.now = realNow;
  });
  const url = (start: number, from = "2026-11-10", to = "2027-02-07") =>
    `${root}/calendars/cal-1/appointments?pageSize=25&recordStartIndex=${start}&startDate=${from}&endDate=${to}`;

  test("asks for today through 89 days on, then emits the appointment that appears", async () => {
    Date.now = () => Date.parse("2026-11-10T23:30:00Z");
    const input = { params: { calendarId: "cal-1" }, subscriptionId: "s" };
    const seed = mockCtx([{ body: page([{ id: "a1" }], 1) }]);
    const seeded = await newAppointment.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url(0));

    Date.now = () => Date.parse("2026-11-11T00:05:00Z");
    const next = mockCtx([{ body: page([{ id: "a1" }, { id: "a2" }], 2) }]);
    const out = await newAppointment.poll!({ ...input, state: seeded.nextState }, next.ctx);
    assertEquals(next.calls[0].url, url(0, "2026-11-11", "2027-02-08"));
    assertEquals(out.events, [{ id: "a2" }]);
  });

  test("an empty calendar window (416) is an empty list", async () => {
    Date.now = () => Date.parse("2026-11-10T08:00:00Z");
    const { ctx } = mockCtx([{ status: 416, body: { message: "Range Not Satisfiable" } }]);
    const out = await newAppointment.poll!(
      { params: { calendarId: "cal-1" }, subscriptionId: "s", state: {} },
      ctx,
    );
    assertEquals(out.events, []);
  });
});
