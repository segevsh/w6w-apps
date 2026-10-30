import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-draft.ts";

test("create-draft: POSTs the message resource directly to /me/messages", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "d1", isDraft: true } }]);
  const out = await action.execute({ to: ["a@b.com"], subject: "draft" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages");
  assertEquals(calls[0].method, "POST");
  // Unlike sendMail there is no `message` wrapper here.
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "draft");
  assertEquals(body.message, undefined);
  assertEquals((out as { id: string }).id, "d1");
});

test("create-draft: places the draft in a named folder when asked", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ folderId: "archive", subject: "x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/mailFolders/archive/messages");
});

test("create-draft: does not require recipients — a draft may be incomplete", () => {
  assertEquals(action.params?.find((p) => p.key === "to")?.required, false);
});

test("create-draft: builds an empty body when nothing is supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
