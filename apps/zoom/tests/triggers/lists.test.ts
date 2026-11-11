import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newMeeting from "../../triggers/new-meeting.ts";
import newWebinar from "../../triggers/new-webinar.ts";
import newUser from "../../triggers/new-user.ts";

// deno-lint-ignore no-explicit-any
type T = any;
const meeting = (id: number) => ({ id, uuid: `u${id}`, topic: `m${id}`, type: 2 });
const webinar = (id: number) => ({ id, uuid: `w${id}`, topic: `w${id}` });
const user = (id: string) => ({ id, email: `${id}@example.com`, status: "active" });

const CASES: Array<{
  name: string;
  trigger: T;
  params: Record<string, unknown>;
  key: string;
  make: (n: number) => unknown;
  url: string;
}> = [
  {
    name: "new-meeting",
    trigger: newMeeting,
    params: { userId: "me" },
    key: "meetings",
    make: meeting,
    url: "https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=300",
  },
  {
    name: "new-webinar",
    trigger: newWebinar,
    params: { userId: "me" },
    key: "webinars",
    make: webinar,
    url: "https://api.zoom.us/v2/users/me/webinars?page_size=300",
  },
  {
    name: "new-user",
    trigger: newUser,
    params: { status: "active" },
    key: "users",
    make: (n) => user(`u${n}`),
    url: "https://api.zoom.us/v2/users?status=active&page_size=300",
  },
];

for (const c of CASES) {
  const input = { params: c.params, subscriptionId: "sub-1" };
  const page = (n: number[], token = "") => ({
    body: { [c.key]: n.map(c.make), next_page_token: token, page_size: 300 },
  });

  test(`${c.name}: seeds without emitting, emits only the added row, retries idempotently`, async () => {
    const seeded = await c.trigger.poll({ ...input, state: {} }, mockCtx([page([1, 2])]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

    const first = await c.trigger.poll(
      { ...input, state: seeded.nextState },
      mockCtx([page([1, 2, 3])]).ctx,
    );
    const again = await c.trigger.poll(
      { ...input, state: seeded.nextState },
      mockCtx([page([1, 2, 3])]).ctx,
    );
    assertEquals(first.events, [c.make(3)]);
    assertEquals(again, first);
  });

  test(`${c.name}: a removal or an edit of an existing row does not emit`, async () => {
    const seeded = await c.trigger.poll({ ...input, state: {} }, mockCtx([page([1, 2])]).ctx);
    const removed = await c.trigger.poll(
      { ...input, state: seeded.nextState },
      mockCtx([page([1])]).ctx,
    );
    assertEquals(removed.events, []);
    const edited = page([1, 2]);
    (edited.body[c.key] as Array<Record<string, unknown>>)[0].topic = "renamed";
    (edited.body[c.key] as Array<Record<string, unknown>>)[0].email = "renamed@example.com";
    const after = await c.trigger.poll(
      { ...input, state: seeded.nextState },
      mockCtx([edited]).ctx,
    );
    assertEquals(after.events, []);
  });

  test(`${c.name}: the request is the wrapped list endpoint (literal), 300 rows a page`, async () => {
    const { ctx, calls } = mockCtx([page([1])]);
    await c.trigger.poll({ ...input, state: {} }, ctx);
    assertEquals(calls.map(({ method, url, body }) => ({ method, url, body })), [{
      method: "GET",
      url: c.url,
      body: null,
    }]);
  });

  test(`${c.name}: a second page is read with next_page_token`, async () => {
    const { ctx, calls } = mockCtx([page([1], "tok-2"), page([2])]);
    const seeded = await c.trigger.poll({ ...input, state: {} }, ctx);
    assertEquals(seeded.events, []);
    assertEquals(calls.length, 2);
    assertEquals(calls[1].url, `${c.url}&next_page_token=tok-2`);
    const next = await c.trigger.poll(
      { ...input, state: seeded.nextState },
      mockCtx([page([1], "tok-2"), page([2, 3])]).ctx,
    );
    assertEquals(next.events, [c.make(3)]);
  });

  test(`${c.name}: a collection longer than the pages read is refused, not compared partly`, async () => {
    const pages = Array.from({ length: 16 }, () => page([1], "more"));
    await assertRejects(
      async () => await c.trigger.poll({ ...input, state: {} }, mockCtx(pages).ctx),
      Error,
      "more",
    );
  });
}

test("new-meeting: another user is requested by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { meetings: [], next_page_token: "" } }]);
  await (newMeeting as T).poll(
    { params: { userId: "a@b.test" }, state: {}, subscriptionId: "s" },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.zoom.us/v2/users/a%40b.test/meetings?type=scheduled&page_size=300",
  );
});
