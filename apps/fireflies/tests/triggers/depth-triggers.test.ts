import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, sent } from "../_helpers.ts";
import newActiveMeeting from "../../triggers/new-active-meeting.ts";
import newChannel from "../../triggers/new-channel.ts";
import newContact from "../../triggers/new-contact.ts";
import newTeamUser from "../../triggers/new-team-user.ts";

const gql = (data: unknown) => ({ body: { data } });

// One row per snapshot trigger: the LITERAL GraphQL operation the first request must carry, the
// vendor body before / after, and the one record the second check must emit.
const cases = [
  {
    trigger: newChannel,
    operation: "query Channels",
    field: "channels",
    a: { id: "c1", title: "One" },
    b: { id: "c2", title: "Two" },
  },
  {
    trigger: newContact,
    operation: "query Contacts",
    field: "contacts",
    a: { email: "a@example.com", name: "A" },
    b: { email: "b@example.com", name: "B" },
  },
  {
    trigger: newTeamUser,
    operation: "query Users",
    field: "users",
    a: { user_id: "u1", email: "a@example.com" },
    b: { user_id: "u2", email: "b@example.com" },
  },
  {
    trigger: newActiveMeeting,
    operation: "query ActiveMeetings",
    field: "active_meetings",
    a: { id: "m1", title: "One" },
    b: { id: "m2", title: "Two" },
  },
];

for (const c of cases) {
  test(`${c.trigger.key}: seeds, emits only the added record, retries identically, posts the literal query`, async () => {
    const seed = mockCtx([gql({ [c.field]: [c.a] })]);
    const seeded = await c.trigger.poll!({ params: {}, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = () => {
      const m = mockCtx([gql({ [c.field]: [c.a, c.b] })]);
      return { m, p: c.trigger.poll!({ params: {}, state: seeded.nextState }, m.ctx) };
    };
    const first = run();
    const out = await first.p;
    assertEquals(out.events, [c.b]);
    assertEquals(await run().p, out);
    const call = first.m.calls[0];
    assertEquals({ method: call.method, url: call.url }, {
      method: "POST",
      url: "https://api.fireflies.ai/graphql",
    });
    assertEquals(sent(call).query.includes(c.operation), true);
    assertEquals(
      sent(call).query.includes(`${c.field} {`) || sent(call).query.includes(`${c.field}(`),
      true,
    );
  });
}

test("new-contact treats the same email in another case as the same contact", async () => {
  const seeded = await newContact.poll!(
    { params: {}, state: {} },
    mockCtx([gql({ contacts: [{ email: "Ada@Example.com" }] })]).ctx,
  );
  const out = await newContact.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([gql({ contacts: [{ email: "ada@example.com" }] })]).ctx,
  );
  assertEquals(out.events, []);
});

test("new-active-meeting forgets a meeting once it ends", async () => {
  const live = (...ids: string[]) => gql({ active_meetings: ids.map((id) => ({ id })) });
  const s1 = await newActiveMeeting.poll!({ params: {}, state: {} }, mockCtx([live("m1")]).ctx);
  const s2 = await newActiveMeeting.poll!(
    { params: {}, state: s1.nextState },
    mockCtx([live()]).ctx,
  );
  const s3 = await newActiveMeeting.poll!(
    { params: {}, state: s2.nextState },
    mockCtx([live("m2")]).ctx,
  );
  assertEquals(s3.events, [{ id: "m2" }]);
});

test("new-active-meeting never emits the join link", async () => {
  const row = {
    id: "m1",
    title: "One",
    meeting_link: "https://meet.example.com/j/1?pwd=test-secret",
  };
  const s1 = await newActiveMeeting.poll!(
    { params: {}, state: {} },
    mockCtx([gql({ active_meetings: [] })]).ctx,
  );
  const out = await newActiveMeeting.poll!(
    { params: {}, state: s1.nextState },
    mockCtx([gql({ active_meetings: [row] })]).ctx,
  );
  assertEquals(out.events, [{ id: "m1", title: "One" }]);
  assertEquals(JSON.stringify(out.events).includes("meeting_link"), false);
  assertEquals(JSON.stringify(newActiveMeeting.output).includes("meeting_link"), false);
});
