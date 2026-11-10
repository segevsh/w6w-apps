import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import newVenue from "../../triggers/new-venue.ts";
import newInstructor from "../../triggers/new-instructor.ts";
import newStaffMember from "../../triggers/new-staff-member.ts";
import newCourse from "../../triggers/new-course.ts";
import newMembershipPlan from "../../triggers/new-membership-plan.ts";
import newOfferingType from "../../triggers/new-offering-type.ts";

const base = "https://goteamup.com/api/v2";
const cases = [
  { name: "new-venue", trigger: newVenue, path: "/venues" },
  { name: "new-instructor", trigger: newInstructor, path: "/instructors" },
  { name: "new-staff-member", trigger: newStaffMember, path: "/staff" },
  { name: "new-course", trigger: newCourse, path: "/courses" },
  { name: "new-membership-plan", trigger: newMembershipPlan, path: "/memberships" },
  { name: "new-offering-type", trigger: newOfferingType, path: "/offering_types" },
];
const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: number) => ({ id, name: `Record ${id}` });

for (const { name, trigger, path } of cases) {
  test(`${name}: seeds without emitting, emits only the new id, retries idempotently`, async () => {
    const seed = mockCtx([{ body: pageEnvelope([row(1)]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

    const run = () =>
      trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: pageEnvelope([row(1), row(2)]) }]).ctx,
      );
    const first = await run();
    assertEquals(first.events.map((e) => (e as { key: string }).key), ["2"]);
    assertEquals(await run(), first);
  });

  test(`${name}: requests the wrapped list endpoint at the documented page size`, async () => {
    const m = mockCtx([{ body: pageEnvelope([row(1)]) }]);
    await trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, `${base}${path}?page=1&page_size=100`);
  });
}

test("snapshot triggers: follow `next` to the last page and see every row", async () => {
  const page1 = { ...pageEnvelope([row(1)], 2), next: `${base}/venues?page=2` };
  const seed = mockCtx([{ body: page1 }, { body: pageEnvelope([row(2)], 2) }]);
  const seeded = await newVenue.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls.map((c) => c.url), [
    `${base}/venues?page=1&page_size=100`,
    `${base}/venues?page=2&page_size=100`,
  ]);
  const next = await newVenue.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([
      { body: { ...pageEnvelope([row(1)], 3), next: `${base}/venues?page=2` } },
      { body: pageEnvelope([row(2), row(3)], 3) },
    ]).ctx,
  );
  assertEquals(next.events.map((e) => (e as { key: string }).key), ["3"]);
});

test("snapshot triggers: a vendor error propagates (failed check, not a silent empty)", async () => {
  await assertRejects(() =>
    newVenue.poll!(
      { ...input, state: {} },
      mockCtx([{ status: 500, body: { message: "boom" } }]).ctx,
    )
  );
});
