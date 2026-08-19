import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

const users = [
  {
    id: "1",
    display_name: "Ada",
    email: "ada@example.com",
    credentials_api3: [{ client_id: "abc" }],
    credentials_email: { logged_in_at: "2026-08-01T00:00:00Z" },
  },
  { id: "2", display_name: "Grace", email: "grace@example.com", credentials_email: null },
  { id: "3", display_name: "Alan", email: "alan@example.com", is_disabled: true },
  { id: "4", display_name: "Embed 9", credentials_embed: [{ id: "e1" }] },
];

/** Licensing is the question, and embed users are not people. */
Deno.test("user-list: counts enabled, disabled and never-logged-in people only", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: users }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/users");
  assertEquals(result.enabledCount, 2);
  assertEquals(result.disabledCount, 1);
  assertEquals(result.neverLoggedInCount, 2, "Grace never logged in, and nor did disabled Alan");
  assertEquals(result.embedCount, 1);
});

/** The only record of which integrations exist. */
Deno.test("user-list: names who holds API credentials", async () => {
  const { ctx } = mockCtx([{ status: 200, body: users }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.withApiCredentials, ["Ada"]);
});

Deno.test("user-list: filters on the email substring here", async () => {
  const { ctx } = mockCtx([{ status: 200, body: users }], D);
  const result = await action.execute({ email: "GRACE@" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
});

Deno.test("user-list: paging is clamped to what Looker accepts", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({ perPage: 99999, page: 0 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("per_page"), "1000");
  assertEquals(q.get("page"), "1");
});

/** Asking for only the fields used keeps the response small and the intent clear. */
Deno.test("user-list: asks for the specific fields it reads", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({}, ctx);
  const fields = new URL(calls[0].url).searchParams.get("fields")!;
  for (const field of ["credentials_api3", "credentials_embed", "credentials_email"]) {
    assert(fields.includes(field), fields);
  }
});

Deno.test("user-list: says embed users can outnumber real ones", () => {
  assert(/EMBED users/.test(action.description!), action.description);
});
