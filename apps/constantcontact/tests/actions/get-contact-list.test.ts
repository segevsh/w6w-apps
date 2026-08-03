import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-contact-list.ts";

Deno.test("get-contact-list: GETs /v3/contact_lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { list_id: "l1", name: "Newsletter" } }]);
  const out = await action.execute!({ listId: "l1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contact_lists/l1");
  assertEquals(out, { list_id: "l1", name: "Newsletter" });
});

Deno.test("get-contact-list: forwards include_membership_count only when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ listId: "l1", includeMembershipCount: "all" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include_membership_count"), "all");
  await action.execute!({ listId: "l1" }, ctx);
  assert(!new URL(calls[1].url).searchParams.has("include_membership_count"));
});
