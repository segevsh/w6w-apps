import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-list-contacts.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("get-list-contacts: GETs the contacts with the segment and wraps the array", async () => {
  const data = [{ email: "a@b.co", email_status: "valid", full_name: "A B" }];
  const { ctx, calls } = mockCtx([{ body: { status: { code: 200 }, data } }]);
  const out = await exec(action, { id: 12, segment: "valid" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://wiza.co/api/lists/12/contacts?segment=valid");
  assertEquals(out, { contacts: data });
});

Deno.test("get-list-contacts: segment defaults to people; an invalid one is refused locally", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  assertEquals(await exec(action, { id: 1 }, ctx), { contacts: [] });
  assertEquals(calls[0].url, "https://wiza.co/api/lists/1/contacts?segment=people");
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: 1, segment: "all" }, none.ctx), Error, "segment");
  assertEquals(none.calls.length, 0);
});

Deno.test("get-list-contacts: 'No contacts to export' (400) fails the action", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { status: { code: 400, message: "No contacts to export" } },
  }]);
  await assertRejects(
    () => exec(action, { id: 1, segment: "risky" }, ctx),
    Error,
    "No contacts to export",
  );
});
