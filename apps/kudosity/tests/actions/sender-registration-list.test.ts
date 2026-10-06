import { assertEquals } from "@std/assert";
import senderRegistrationList from "../../actions/sender-registration-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sender-registration-list: page-numbered query and unwrapped registrations", async () => {
  const pagination = { type: "page", page: 2, limit: 25, total_count: 30 };
  const { ctx, calls } = mockCtx([{
    body: envelope({ registrations: [{ registration_id: "a" }] }, { pagination }),
  }]);
  const out = await senderRegistrationList.execute({
    page: 2,
    sender: "61412312312",
    status: "VERIFIED,PENDING_APPROVAL",
    childAccountId: "c1",
  }, ctx) as { registrations: unknown[]; pagination: unknown };
  assertEquals(pathOf(calls[0].url), "/v2/senders/registrations");
  const q = queryOf(calls[0].url);
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("sender"), "61412312312");
  assertEquals(q.get("status"), "VERIFIED,PENDING_APPROVAL");
  assertEquals(q.get("child_account_id"), "c1");
  assertEquals(out.registrations.length, 1);
  assertEquals(out.pagination, pagination);
});
