import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/container-delete.ts";

const D = { display: { account: "myaccount" } };

const listing = (count: number, more = false) => ({
  status: 200,
  body: `<EnumerationResults><Blobs>${
    Array.from({ length: count }, (_, i) => `<Blob><Name>b${i}</Name></Blob>`).join("")
  }</Blobs><NextMarker>${more ? "tok" : ""}</NextMarker></EnumerationResults>`,
});

/** Azure deletes a container with all its blobs — unlike S3 or GCS. */
Deno.test("container-delete: counts the blobs first, then deletes", async () => {
  const { ctx, calls } = mockCtx([listing(3), { status: 202, body: "" }], D);
  const result = await action.execute(
    { container: "uploads", confirmName: "uploads", acknowledgeBlobCount: 3 },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(result.blobsDeleted, 3);
  assertEquals(result.nameHeld, true);
});

Deno.test("container-delete: the count must be acknowledged exactly", async () => {
  for (const acknowledged of [0, 2, 4]) {
    const { ctx, calls } = mockCtx([listing(3)], D);
    let message = "";
    try {
      await action.execute(
        { container: "uploads", confirmName: "uploads", acknowledgeBlobCount: acknowledged },
        ctx,
      );
    } catch (err) {
      message = String(err);
    }
    assert(/holds 3 blob\(s\)/.test(message), `${acknowledged}: ${message}`);
    assert(/does not require it to be empty/.test(message), message);
    assertEquals(calls.length, 1, "nothing was deleted");
  }
});

/** An empty container is the case where 0 is the right acknowledgement. */
Deno.test("container-delete: an empty container deletes with a zero acknowledgement", async () => {
  const { ctx } = mockCtx([listing(0), { status: 202, body: "" }], D);
  const result = await action.execute(
    { container: "uploads", confirmName: "uploads" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.blobsDeleted, 0);
});

/** More than a page means no honest number can be put in front of the caller. */
Deno.test("container-delete: refuses when it cannot count the contents", async () => {
  const { ctx, calls } = mockCtx([listing(5000, true)], D);
  let message = "";
  try {
    await action.execute(
      { container: "uploads", confirmName: "uploads", acknowledgeBlobCount: 5000 },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/more than one page/.test(message), message);
  assert(/Empty it first/.test(message), message);
  assertEquals(calls.length, 1);
});

Deno.test("container-delete: the name must be typed back", async () => {
  for (const confirm of [undefined, "", "UPLOADS", "uploads2"]) {
    const { ctx, calls } = mockCtx([], D);
    let message = "";
    try {
      await action.execute({ container: "uploads", confirmName: confirm }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmName` must match/.test(message), `${confirm}: ${message}`);
    assertEquals(calls.length, 0);
  }
});

/** The name is unusable for at least 30 seconds afterwards. */
Deno.test("container-delete: warns that the name is held", async () => {
  const { ctx, logs } = mockCtx([listing(0), { status: 202, body: "" }], D);
  await action.execute({ container: "uploads", confirmName: "uploads" }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/unusable for at least 30 seconds/.test(logs[0].message), logs[0].message);
});
