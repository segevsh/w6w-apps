import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import signrequestCancel from "../../actions/signrequest-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("signrequest-cancel: POSTs /signrequests/{id}/cancel_signrequest/", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { uuid: "sr-1" } }]);
  await signrequestCancel.execute({ signrequestId: "sr-1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v1/signrequests/sr-1/cancel_signrequest/");
});
