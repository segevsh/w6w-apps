import { assertEquals } from "@std/assert";
import action from "../../actions/create-sender-identity.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-sender-identity: POSTs /v1/identities with wire names", async () => {
  const resp = { data: { id: "i1", email: "a@x.com", is_verified: false } };
  const { ctx, calls } = mockCtx([{ status: 201, body: resp }]);
  const out = await exec(action, {
    domainId: "d1",
    email: "a@x.com",
    name: "A",
    replyToEmail: "r@x.com",
    replyToName: "R",
    addNote: true,
    personalNote: "Please verify",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/identities");
  assertEquals(bodyOf(calls[0]), {
    domain_id: "d1",
    email: "a@x.com",
    name: "A",
    reply_to_email: "r@x.com",
    reply_to_name: "R",
    add_note: true,
    personal_note: "Please verify",
  });
  assertEquals(out, resp);
});

Deno.test("create-sender-identity: sends only the required pair when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }]);
  await exec(action, { domainId: "d1", email: "a@x.com" }, ctx);
  assertEquals(bodyOf(calls[0]), { domain_id: "d1", email: "a@x.com" });
});
