import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

test("contact-list: forwards filters and drops unset ones", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await contactList.execute({ type: "individual", tags: "vip, board", page: 2 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(queryOf(calls[0].url), { type: "individual", tags: "vip, board", page: "2" });
});
