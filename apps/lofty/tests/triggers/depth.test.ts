import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTask from "../../triggers/new-task.ts";
import newAppointment from "../../triggers/new-appointment.ts";
import newNote from "../../triggers/new-note.ts";
import newTeamMember from "../../triggers/new-team-member.ts";

const API = "https://api.lofty.com/v1.0";
const at = (state: unknown, params: Record<string, unknown> = {}) =>
  ({ params, state, subscriptionId: "sub-1" }) as never;

// Per-lead lists: one literal GET each; the response shape differs per endpoint.
const perLead = [
  {
    trigger: newTask,
    url: `${API}/tasks?leadId=555`,
    idKey: "id",
    wrap: (rows: unknown[]) => ({ taskList: rows }),
  },
  {
    trigger: newAppointment,
    url: `${API}/appts?leadId=555`,
    idKey: "id",
    wrap: (rows: unknown[]) => rows,
  },
  {
    trigger: newNote,
    url: `${API}/notes?leadId=555`,
    idKey: "noteId",
    wrap: (rows: unknown[]) => ({ notes: rows }),
  },
];
for (const { trigger, url, idKey, wrap } of perLead) {
  test(`${trigger.key}: seeds, emits only the new id, retries identically, sends its literal request`, async () => {
    const params = { leadId: 555 };
    const body = (...ids: number[]) => ({ body: wrap(ids.map((id) => ({ [idKey]: id }))) });
    const seed = mockCtx([body(1)]);
    const seeded = await trigger.poll!(at({}, params), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const first = await trigger.poll!(at(seeded.nextState, params), mockCtx([body(2, 1)]).ctx);
    const retry = await trigger.poll!(at(seeded.nextState, params), mockCtx([body(2, 1)]).ctx);
    assertEquals(first.events, [{ [idKey]: 2 }]);
    assertEquals(retry, first);
  });
}

const members = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: from + i }));
const page = (rows: unknown[]) => ({ body: { get_metadata: {}, members: rows } });

test("new-team-member: walks limit/offset to the first empty page, seeds, emits only the new id", async () => {
  const seed = mockCtx([page(members(0, 100)), page(members(100, 3)), page([])]);
  const seeded = await newTeamMember.poll!(at({}), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.map((c) => [c.method, c.url]), [
    ["GET", `${API}/members?limit=100&offset=0`],
    ["GET", `${API}/members?limit=100&offset=100`],
    ["GET", `${API}/members?limit=100&offset=103`],
  ]);
  const run = () =>
    newTeamMember.poll!(
      at(seeded.nextState),
      mockCtx([page([...members(0, 100)]), page([...members(100, 3), { id: 999 }]), page([])]).ctx,
    );
  const first = await run();
  assertEquals(first.events, [{ id: 999 }]);
  assertEquals(await run(), first);
});

test("new-team-member: refuses a list longer than 50 pages (the 5000-row cap)", async () => {
  const responses = Array.from({ length: 50 }, (_, i) => page([{ id: i }]));
  await assertRejects(() => newTeamMember.poll!(at({}), mockCtx(responses).ctx), Error, "5000");
});
