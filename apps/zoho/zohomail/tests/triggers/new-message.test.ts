import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

const input = { params: { folderId: "2560636000000008014" }, subscriptionId: "sub-1" };
const item = (
  id: string,
  stamp = "stamp-1",
) => ({ messageId: id, subject: `Mail ${id}`, receivedTime: stamp });
const connection = {
  id: "conn_1",
  app: "io.w6w.zohomail",
  auth: "oauth2-us",
  owner: "user_1",
  state: "connected",
  createdAt: "2026-11-09T00:00:00.000Z",
  display: { apiHost: "mail.zoho.com", accountId: "2560636000000008002" },
};
const page = (...rows: unknown[]) =>
  mockCtx([{ body: { status: { code: 200, description: "success" }, data: rows } }], connection);

test("new-message: the first check seeds without events and sends the documented request", async () => {
  const seed = page(item("a"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://mail.zoho.com/api/accounts/2560636000000008002/messages/view?folderId=2560636000000008014&start=1&limit=100&sortBy=date&sortorder=false",
  );
});

test("new-message: emits only the new email, and a retry from the same state is identical", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, page(item("a")).ctx);
  const rows = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
  const again = await trigger.poll!({ ...input, state: first.nextState }, page(...rows).ctx);
  assertEquals(again.events, []);
});
