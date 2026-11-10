import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newRoom from "../../triggers/new-room.ts";
import newContact from "../../triggers/new-contact.ts";
import newContactRequest from "../../triggers/new-contact-request.ts";
import newRoomMember from "../../triggers/new-room-member.ts";
import newRoomTask from "../../triggers/new-room-task.ts";
import newMyTask from "../../triggers/new-my-task.ts";
import newRoomFile from "../../triggers/new-room-file.ts";

type Row = Record<string, unknown>;
const room = { roomId: "9" };

// Each case lists the LITERAL request the wrapped list action sends, and rows in the order the
// vendor returns them (oldest-first for tasks/files, which the trigger re-orders by id).
const cases = [
  {
    name: "new-room",
    trigger: newRoom,
    params: {},
    url: "https://api.chatwork.com/v2/rooms",
    row: (id: number): Row => ({ room_id: id, name: `Room ${id}` }),
    seed: [1, 2],
    next: [1, 2, 3],
    expected: [3],
  },
  {
    name: "new-contact",
    trigger: newContact,
    params: {},
    url: "https://api.chatwork.com/v2/contacts",
    row: (id: number): Row => ({ account_id: id, name: `Person ${id}` }),
    seed: [1, 2],
    next: [1, 2, 3],
    expected: [3],
  },
  {
    name: "new-contact-request",
    trigger: newContactRequest,
    params: {},
    url: "https://api.chatwork.com/v2/incoming_requests",
    row: (id: number): Row => ({ request_id: id, name: `Person ${id}` }),
    seed: [1, 2],
    next: [1, 2, 3],
    expected: [3],
  },
  {
    name: "new-room-member",
    trigger: newRoomMember,
    params: room,
    url: "https://api.chatwork.com/v2/rooms/9/members",
    row: (id: number): Row => ({ account_id: id, role: "member" }),
    seed: [1, 2],
    next: [1, 2, 3],
    expected: [3],
  },
  {
    name: "new-room-task",
    trigger: newRoomTask,
    params: room,
    url: "https://api.chatwork.com/v2/rooms/9/tasks",
    row: (id: number): Row => ({ task_id: id, body: `Task ${id}` }),
    seed: [1, 2],
    next: [1, 2, 3, 4],
    expected: [3, 4],
  },
  {
    name: "new-my-task",
    trigger: newMyTask,
    params: {},
    url: "https://api.chatwork.com/v2/my/tasks",
    row: (id: number): Row => ({ task_id: id, body: `Task ${id}` }),
    seed: [1, 2],
    next: [1, 2, 3],
    expected: [3],
  },
  {
    name: "new-room-file",
    trigger: newRoomFile,
    params: room,
    url: "https://api.chatwork.com/v2/rooms/9/files",
    row: (id: number): Row => ({ file_id: id, filename: `f${id}.pdf` }),
    seed: [1, 2],
    next: [1, 2, 3],
    expected: [3],
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const input = { params: c.params, subscriptionId: "sub-1" };
    const ctx = (ids: number[]) => mockCtx([{ status: 200, body: ids.map(c.row) }]);

    test("seeds without emitting, then emits only the new rows, idempotently", async () => {
      const seeded = await c.trigger.poll!({ ...input, state: {} }, ctx(c.seed).ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const first = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(c.next).ctx);
      const retry = await c.trigger.poll!({ ...input, state: seeded.nextState }, ctx(c.next).ctx);
      assertEquals(first.events, c.expected.map(c.row));
      assertEquals(retry, first);
    });

    test("sends the list action's literal request", async () => {
      const seed = ctx(c.seed);
      await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seed.calls.length, 1);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url);
    });

    test("an empty list (HTTP 204) is no rows, not an error", async () => {
      const { ctx: empty } = mockCtx([{ status: 204 }]);
      const out = await c.trigger.poll!({ ...input, state: {} }, empty);
      assertEquals(out.events, []);
    });
  });
}

describe("newest-first ordering", () => {
  test("new-room-task emits oldest-first even when the vendor lists newest-first", async () => {
    const t = (id: number) => ({ task_id: id });
    const seeded = await newRoomTask.poll!(
      { params: room, subscriptionId: "s", state: {} },
      mockCtx([{ status: 200, body: [t(5), t(4)] }]).ctx,
    );
    const out = await newRoomTask.poll!(
      { params: room, subscriptionId: "s", state: seeded.nextState },
      mockCtx([{ status: 200, body: [t(7), t(6), t(5), t(4)] }]).ctx,
    );
    assertEquals(out.events, [t(6), t(7)]);
  });
});
