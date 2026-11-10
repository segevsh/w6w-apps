import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newProject from "../../triggers/new-project.ts";
import newApiKey from "../../triggers/new-api-key.ts";
import newMember from "../../triggers/new-member.ts";
import newInvite from "../../triggers/new-invite.ts";
import newMemberScope from "../../triggers/new-member-scope.ts";

const opts = { display: { projectId: "proj_1" } };

interface Case {
  name: string;
  trigger: typeof newProject;
  params: Record<string, unknown>;
  /** One record and its response body, built from an id. */
  record(id: string): unknown;
  body(records: unknown[]): unknown;
  url: string;
}

const cases: Case[] = [
  {
    name: "new-project",
    trigger: newProject,
    params: {},
    record: (id) => ({ project_id: id, name: "n" }),
    body: (projects) => ({ projects }),
    url: "https://api.deepgram.com/v1/projects",
  },
  {
    name: "new-api-key",
    trigger: newApiKey,
    params: {},
    record: (id) => ({ api_key: { api_key_id: id, comment: "c", scopes: ["member"] } }),
    body: (api_keys) => ({ api_keys }),
    url: "https://api.deepgram.com/v1/projects/proj_1/keys",
  },
  {
    name: "new-member",
    trigger: newMember,
    params: {},
    record: (id) => ({ member_id: id, email: "a@example.com" }),
    body: (members) => ({ members }),
    url: "https://api.deepgram.com/v1/projects/proj_1/members",
  },
  {
    name: "new-invite",
    trigger: newInvite,
    params: {},
    record: (id) => ({ email: id, scope: "member" }),
    body: (invites) => ({ invites }),
    url: "https://api.deepgram.com/v1/projects/proj_1/invites",
  },
  {
    name: "new-member-scope",
    trigger: newMemberScope,
    params: { memberId: "m 1" },
    record: (id) => id,
    body: (scopes) => ({ scopes }),
    url: "https://api.deepgram.com/v1/projects/proj_1/members/m%201/scopes",
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const respond = (ids: string[]) => ({ body: c.body(ids.map((id) => c.record(id))) });
    const run = async (state: unknown, ids: string[]) => {
      const m = mockCtx([respond(ids)], opts);
      const out = await c.trigger.poll!({ params: c.params, state }, m.ctx);
      return { out, calls: m.calls };
    };
    // What the trigger emits for one id: the record, or `{ scope }` for the bare scope strings.
    const emitted = (id: string) => c.name === "new-member-scope" ? { scope: id } : c.record(id);

    test("seeds without emitting", async () => {
      const { out } = await run({}, ["a@example.com"]);
      assertEquals(out.events, []);
      assertEquals(out.nextState.seeded, true);
    });

    test("emits only the new record, and a retry is identical", async () => {
      const seeded = await run({}, ["a@example.com"]);
      const first = await run(seeded.out.nextState, ["a@example.com", "b@example.com"]);
      assertEquals(first.out.events, [emitted("b@example.com")]);
      const retry = await run(seeded.out.nextState, ["a@example.com", "b@example.com"]);
      assertEquals(retry.out, first.out);
    });

    test("requests the literal endpoint", async () => {
      const { calls } = await run({}, ["a@example.com"]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
    });
  });
}

test("new-member-scope refuses to run without a member id", async () => {
  await assertRejects(
    () => newMemberScope.poll!({ params: {}, state: {} }, mockCtx([], opts).ctx),
    Error,
    "memberId",
  );
});
