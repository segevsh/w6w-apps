import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/credential-create-issue-send.ts";
import { CREDENTIAL, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("credential-create-issue-send: POST /v1/credentials/create-issue-send with the create body", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...CREDENTIAL, status: "issued" } }]);
  const out = await action.execute(
    { groupId: "g1", recipientName: "Ada", recipientEmail: "ada@example.com" },
    ctx,
  ) as { status: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/credentials/create-issue-send");
  assertEquals(JSON.parse(calls[0].body!), {
    groupId: "g1",
    recipient: { name: "Ada", email: "ada@example.com" },
  });
  assertEquals(out.status, "issued");
});

Deno.test("credential-create-issue-send: requires a template and a recipient name; never idempotent", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ groupId: "g", recipientName: " " }, ctx),
    Error,
    "recipientName",
  );
  assertEquals(action.idempotent, false);
});
