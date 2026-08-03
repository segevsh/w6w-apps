import { assert, assertEquals } from "@std/assert";
import updateStatus from "../../actions/update-time-off-request-status.ts";
import { mockCtx, optionValues } from "../_helpers.ts";

Deno.test("update-time-off-request-status: PUTs to /time_off/requests/{id}/status", async () => {
  assertEquals(updateStatus.type, "perform");
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await updateStatus.execute({ requestId: "7", status: "approved" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/v1/time_off/requests/7/status");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: "approved" });
  assertEquals(out, { status: 200 });
});

Deno.test("update-time-off-request-status: is idempotent", () => {
  // Setting a request to `approved` twice leaves it approved.
  assertEquals(updateStatus.idempotent, true);
});

Deno.test("update-time-off-request-status: options mirror the schema, duplicates included", () => {
  // Both spellings are accepted by BambooHR. Tidying them away would reject a
  // value a workflow legitimately read out of a request payload. Note this
  // vocabulary differs from create: `canceled` in, `requested` out.
  assertEquals(
    optionValues(updateStatus, "status"),
    ["approved", "denied", "declined", "canceled", "cancelled"],
  );
  assert(!optionValues(updateStatus, "status").includes("requested"));
});

Deno.test("update-time-off-request-status: an optional note is included when set", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }, { body: "" }]);
  await updateStatus.execute({ requestId: "7", status: "denied", note: "No cover" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: "denied", note: "No cover" });

  await updateStatus.execute({ requestId: "7", status: "denied" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { status: "denied" });
});

Deno.test("update-time-off-request-status: requestId and status are required, id escaped", async () => {
  const required = (updateStatus.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["requestId", "status"]);
  const { ctx, calls } = mockCtx([{ body: "" }]);
  await updateStatus.execute({ requestId: "a/b", status: "approved" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/time_off/requests/a%2Fb/status");
});
