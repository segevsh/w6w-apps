import { assertEquals, assertRejects } from "@std/assert";
import uploadList from "../../actions/upload-list.ts";
import { bodyOf, mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("upload-list: POST /api/v1/recordings/upload/list on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { uploads: page([{ recording_id: "r9" }]) },
  }]);
  const out = await uploadList.execute({ status: "FAILED", cursor: "c1" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/recordings/upload/list");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), { pagination: { cursor: "c1" }, filters: { status: "FAILED" } });
  assertEquals((out as { hasMore: boolean }).hasMore, false);
});

Deno.test("upload-list: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(uploadList.execute({ status: "FAILED", cursor: "c1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
