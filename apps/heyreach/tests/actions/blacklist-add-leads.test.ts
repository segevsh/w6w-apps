import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/blacklist-add-leads.ts";

const leads = [{ profileUrl: "https://www.linkedin.com/in/john-doe/" }];

Deno.test("blacklist-add-leads: POSTs the lead entries verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { added: 1 } }]);
  await action.execute!({ leads }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/blacklist/AddLeads");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { leads });
});

/** Every identifier the operation's prose documents is accepted, not just profileUrl. */
Deno.test("blacklist-add-leads: member id, email and name identifiers are passed through", async () => {
  const mixed = [
    { linkedInProfileId: "abc123" },
    { email: "a@b.com" },
    { fullName: "John Doe" },
  ];
  const { ctx, calls } = mockCtx([{ status: 200, body: { added: 3 } }]);
  await action.execute!({ leads: mixed }, ctx);
  assertEquals(jsonBody(calls[0]).leads, mixed);
});

/** A 200 does not mean every entry landed — the per-entry result is returned. */
Deno.test("blacklist-add-leads: duplicates and validation errors come back with the counts", async () => {
  const body = {
    added: 1,
    duplicates: ["abc123"],
    validationErrors: ["index 2: no identifier"],
    entries: [{ inputIndex: 0, id: 9, created: true }],
  };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute!({ leads }, ctx), body);
});
