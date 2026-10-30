import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import listSenders from "../../actions/list-senders.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1 }], Total: 1 } };

// ----------------------------------------------------------------- list-senders

test("list-senders: GETs /v3/REST/sender with its filters", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listSenders.execute!({ email: "a@x.com", isDefaultSender: true, status: "Active" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/REST/sender");
  assertEquals(url.searchParams.get("Email"), "a@x.com");
  assertEquals(url.searchParams.get("IsDefaultSender"), "true");
  assertEquals(url.searchParams.get("Status"), "Active");
});
