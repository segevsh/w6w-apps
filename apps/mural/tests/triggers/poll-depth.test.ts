import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newMuralTag from "../../triggers/new-mural-tag.ts";
import newMuralUser from "../../triggers/new-mural-user.ts";
import newRoom from "../../triggers/new-room.ts";
import newRoomFolder from "../../triggers/new-room-folder.ts";
import newRoomMember from "../../triggers/new-room-member.ts";
import newWidget from "../../triggers/new-widget.ts";
import newWorkspace from "../../triggers/new-workspace.ts";

const API = "https://app.mural.co/api/public/v1";

// Bounded lists (brief 9.1 c): read whole, compared check to check, only added rows fire.
const cases = [
  { name: "new-workspace", trigger: newWorkspace, params: {}, url: `${API}/workspaces?limit=99` },
  {
    name: "new-room",
    trigger: newRoom,
    params: { workspaceId: "ws1" },
    url: `${API}/workspaces/ws1/rooms?limit=99`,
  },
  {
    name: "new-room-folder",
    trigger: newRoomFolder,
    params: { roomId: 42 },
    url: `${API}/rooms/42/folders?limit=99`,
  },
  {
    name: "new-room-member",
    trigger: newRoomMember,
    params: { roomId: 42 },
    url: `${API}/rooms/42/users?limit=99`,
  },
  {
    name: "new-mural-user",
    trigger: newMuralUser,
    params: { muralId: "ws1.100" },
    url: `${API}/murals/ws1.100/users?limit=99`,
  },
  {
    name: "new-widget",
    trigger: newWidget,
    params: { muralId: "ws1.100" },
    url: `${API}/murals/ws1.100/widgets?limit=99`,
  },
  {
    name: "new-mural-tag",
    trigger: newMuralTag,
    params: { muralId: "ws1.100" },
    url: `${API}/murals/ws1.100/tags`,
  },
];

for (const c of cases) {
  const input = { params: c.params, subscriptionId: "sub-1" };
  const page = (ids: string[]) => ({ body: { value: ids.map((id) => ({ id })) } });

  test(`${c.name}: seeds, emits only a new row once, requests its list`, async () => {
    const seed = mockCtx([page(["a"])]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const run = () =>
      c.trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([page(["a", "b"])]).ctx);
    const first = await run();
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(await run(), first);
  });

  if (Object.keys(c.params).length) {
    test(`${c.name}: an unset parent id is refused before any request`, async () => {
      const m = mockCtx([]);
      await assertRejects(() =>
        c.trigger.poll!({ params: {}, subscriptionId: "sub-1", state: {} }, m.ctx)
      );
      assertEquals(m.calls.length, 0);
    });
  }
}

test("new-room: every page of the list is read, following the next token", async () => {
  const input = { params: { workspaceId: "ws1" }, subscriptionId: "sub-1" };
  const m = mockCtx([
    { body: { value: [{ id: "r1" }], next: "tok-2" } },
    { body: { value: [{ id: "r2" }] } },
  ]);
  const seeded = await newRoom.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(m.calls.map((x) => x.url), [
    `${API}/workspaces/ws1/rooms?limit=99`,
    `${API}/workspaces/ws1/rooms?limit=99&next=tok-2`,
  ]);
  const next = await newRoom.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([
      { body: { value: [{ id: "r1" }], next: "tok-2" } },
      { body: { value: [{ id: "r2" }, { id: "r3" }] } },
    ]).ctx,
  );
  assertEquals(next.events, [{ id: "r3" }]);
});
