import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newAccount from "../../triggers/new-account.ts";
import newContact from "../../triggers/new-contact.ts";
import newIssueMessage from "../../triggers/new-issue-message.ts";
import newIssueThread from "../../triggers/new-issue-thread.ts";
import newTag from "../../triggers/new-tag.ts";
import newTeam from "../../triggers/new-team.ts";
import newUser from "../../triggers/new-user.ts";

const reply = (items: unknown[], cursor: string | null = null) => ({
  body: { data: items, pagination: { cursor, has_next_page: cursor !== null }, request_id: "r" },
});
const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return {
    method: c.method,
    url: u.origin + u.pathname,
    query: Object.fromEntries(u.searchParams),
  };
};
const rec = (id: string) => ({ id, name: `n-${id}` });

const CASES = [
  {
    name: "new-account",
    trigger: newAccount,
    params: {},
    url: "https://api.usepylon.com/accounts",
    query: { limit: "200" },
  },
  {
    name: "new-contact",
    trigger: newContact,
    params: {},
    url: "https://api.usepylon.com/contacts",
    query: { limit: "200" },
  },
  {
    name: "new-user",
    trigger: newUser,
    params: {},
    url: "https://api.usepylon.com/users",
    query: {},
  },
  {
    name: "new-team",
    trigger: newTeam,
    params: {},
    url: "https://api.usepylon.com/teams",
    query: {},
  },
  {
    name: "new-tag",
    trigger: newTag,
    params: {},
    url: "https://api.usepylon.com/tags",
    query: {},
  },
  {
    name: "new-issue-message",
    trigger: newIssueMessage,
    params: { id: "42" },
    url: "https://api.usepylon.com/issues/42/messages",
    query: {},
  },
  {
    name: "new-issue-thread",
    trigger: newIssueThread,
    params: { id: "42" },
    url: "https://api.usepylon.com/issues/42/threads",
    query: {},
  },
];

for (const c of CASES) {
  describe(c.name, () => {
    const input = (state: unknown) => ({ params: c.params, subscriptionId: "sub-1", state });

    test("seeds without events, emits only the new record, retries identically", async () => {
      const seed = mockCtx([reply([rec("a"), rec("b")])]);
      const seeded = await c.trigger.poll!(input({}), seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

      const page = [rec("a"), rec("b"), rec("c")];
      const first = mockCtx([reply(page)]);
      const out = await c.trigger.poll!(input(seeded.nextState), first.ctx);
      const retry = await c.trigger.poll!(input(seeded.nextState), mockCtx([reply(page)]).ctx);
      assertEquals(out.events, [rec("c")]);
      assertEquals(retry, out);
      const again = await c.trigger.poll!(input(out.nextState), mockCtx([reply(page)]).ctx);
      assertEquals(again.events, []);
    });

    test("sends the literal list request", async () => {
      const m = mockCtx([reply([rec("a")])]);
      await c.trigger.poll!(input({}), m.ctx);
      assertEquals(m.calls.length, 1);
      assertEquals(req(m.calls[0]), { method: "GET", url: c.url, query: c.query });
    });
  });
}

describe("paged snapshots", () => {
  const input = (state: unknown) => ({ params: {}, subscriptionId: "sub-1", state });

  test("new-account follows nextCursor across pages and sees a record on page 2", async () => {
    const seed = mockCtx([reply([rec("a")], "c2"), reply([rec("b")])]);
    const seeded = await newAccount.poll!(input({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(req(seed.calls[1]), {
      method: "GET",
      url: "https://api.usepylon.com/accounts",
      query: { limit: "200", cursor: "c2" },
    });
    const next = mockCtx([reply([rec("a")], "c2"), reply([rec("b"), rec("z")])]);
    const out = await newAccount.poll!(input(seeded.nextState), next.ctx);
    assertEquals(out.events, [rec("z")]);
  });

  test("new-contact refuses a collection beyond 25 pages", async () => {
    const pages = Array.from({ length: 26 }, (_, i) => reply([rec(`p${i}`)], `c${i + 1}`));
    await assertRejects(() => newContact.poll!(input({}), mockCtx(pages).ctx), Error, "5000");
  });
});
