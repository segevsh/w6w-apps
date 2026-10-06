import { assertEquals, assertRejects } from "@std/assert";
import leadCreate from "../../actions/lead-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-create: POST /zapier/leads sends only set fields, lists split, JSON parsed", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, leadId: 9 } }]);
  const out = await leadCreate.execute({
    firstName: "Ann",
    email: "ann@x.com",
    referralFee: false,
    tags: "buyer, hot",
    removeTags: "cold",
    assignTo: '{"agentUserEmail":"a@b.com"}',
    siteId: 3,
    lastName: "",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/zapier/leads");
  assertEquals(bodyOf(calls[0]), {
    firstName: "Ann",
    email: "ann@x.com",
    referralFee: false,
    tags: ["buyer", "hot"],
    removeTags: ["cold"],
    assignTo: { agentUserEmail: "a@b.com" },
    siteId: 3,
  });
  assertEquals(out, { data: { success: true, leadId: 9 } });
});

Deno.test("lead-create: bad JSON fails before any request; a 400 surfaces errorMessage", async () => {
  const none = mockCtx();
  await assertRejects(
    () => Promise.resolve(leadCreate.execute({ lender: "{" }, none.ctx)),
    Error,
    "lender is not valid JSON",
  );
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Email is invalid") }]);
  await assertRejects(
    () => Promise.resolve(leadCreate.execute({ email: "x" }, ctx)),
    Error,
    "Email is invalid",
  );
});
