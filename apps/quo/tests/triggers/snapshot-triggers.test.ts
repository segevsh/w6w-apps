import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newUser from "../../triggers/new-user.ts";
import newPhoneNumber from "../../triggers/new-phone-number.ts";

const input = (state: unknown) => ({ params: {}, subscriptionId: "sub-1", state });
const req = (c: { method: string; url: string }) => {
  const u = new URL(c.url);
  return { method: c.method, url: u.origin + u.pathname, query: u.search };
};

describe("new-user", () => {
  const u = (id: string) => ({ id, email: `${id}@example.com`, role: "member" });
  const page = (items: unknown[], next: string | null = null) => ({
    body: { data: items, totalItems: items.length, nextPageToken: next },
  });

  test("seeds, emits only the added user, retries identically, sends the literal request", async () => {
    const seed = mockCtx([page([u("US1")])]);
    const seeded = await newUser.poll!(input({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(req(seed.calls[0]), {
      method: "GET",
      url: "https://api.quo.com/v1/users",
      query: "?maxResults=50",
    });
    const run = () => mockCtx([page([u("US1"), u("US2")])]);
    const out = await newUser.poll!(input(seeded.nextState), run().ctx);
    const retry = await newUser.poll!(input(seeded.nextState), run().ctx);
    assertEquals(out.events, [u("US2")]);
    assertEquals(retry, out);
  });

  test("follows nextPageToken so a user on page 2 is seen", async () => {
    const ctx = mockCtx([page([u("US1")], "tok2"), page([u("US2")])]);
    const seeded = await newUser.poll!(input({}), ctx.ctx);
    assertEquals(seeded.events, []);
    assertEquals(req(ctx.calls[1]), {
      method: "GET",
      url: "https://api.quo.com/v1/users",
      query: "?maxResults=50&pageToken=tok2",
    });
    const out = await newUser.poll!(
      input(seeded.nextState),
      mockCtx([page([u("US1")], "tok2"), page([u("US2"), u("US3")])]).ctx,
    );
    assertEquals(out.events, [u("US3")]);
  });
});

describe("new-phone-number", () => {
  const p = (id: string) => ({ id, name: "Sales", number: "+15555550100" });

  test("seeds, emits only the added number, retries identically, sends the literal request", async () => {
    const seed = mockCtx([{ body: { data: [p("PN1")] } }]);
    const seeded = await newPhoneNumber.poll!(input({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(req(seed.calls[0]), {
      method: "GET",
      url: "https://api.quo.com/v1/phone-numbers",
      query: "",
    });
    const run = () => mockCtx([{ body: { data: [p("PN2"), p("PN1")] } }]);
    const out = await newPhoneNumber.poll!(input(seeded.nextState), run().ctx);
    const retry = await newPhoneNumber.poll!(input(seeded.nextState), run().ctx);
    assertEquals(out.events, [p("PN2")]);
    assertEquals(retry, out);
  });
});
