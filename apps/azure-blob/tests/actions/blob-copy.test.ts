import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/blob-copy.ts";

const D = { display: { account: "myaccount" } };

const accepted = (status: string) => ({
  status: 202,
  body: "",
  headers: { "x-ms-copy-id": "copy-1", "x-ms-copy-status": status },
});

const base = {
  sourceContainer: "inbox",
  sourceBlob: "a.txt",
  destinationContainer: "archive",
  destinationBlob: "2026/a.txt",
};

/** The source is a URL, which is what makes cross-account copies work. */
Deno.test("blob-copy: PUTs the destination with the source as a URL", async () => {
  const { ctx, calls } = mockCtx([accepted("success")], D);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/archive/2026%2Fa.txt");
  assertEquals(
    calls[0].headers["x-ms-copy-source"],
    "https://myaccount.blob.core.windows.net/inbox/a.txt",
  );
  assertEquals(result.copyId, "copy-1");
  assertEquals(result.done, true);
});

Deno.test("blob-copy: a blank destination container copies within the source", async () => {
  const { ctx, calls } = mockCtx([accepted("success")], D);
  await action.execute(
    { sourceContainer: "inbox", sourceBlob: "a.txt", destinationBlob: "b.txt" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/inbox/b.txt");
});

/** 202 with `pending` is the normal answer for anything but a small blob. */
Deno.test("blob-copy: a pending copy is not reported as done", async () => {
  const { ctx } = mockCtx([accepted("pending")], D);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(result.copyStatus, "pending");
  assertEquals(result.done, false);
});

/** The destination exists but its contents are not there yet. */
Deno.test("blob-copy: a move refuses while the copy is pending", async () => {
  const { ctx, calls } = mockCtx([accepted("pending")], D);
  let message = "";
  try {
    await action.execute({ ...base, deleteSource: true }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/the source has NOT been deleted/.test(message), message);
  assert(/would lose the blob/.test(message), message);
  assertEquals(calls.length, 1);
});

Deno.test("blob-copy: a finished copy can delete the source, making it a move", async () => {
  const { ctx, calls } = mockCtx([accepted("success"), { status: 202, body: "" }], D);
  const result = await action.execute({ ...base, deleteSource: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, "/inbox/a.txt");
  assertEquals(result.deletedSource, true);
});

/** With deleteSource on, this would delete what was just written. */
Deno.test("blob-copy: copying a blob onto itself is refused", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute(
      { sourceContainer: "inbox", sourceBlob: "a.txt", destinationBlob: "a.txt" },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/the same blob/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("blob-copy: says the copy is asynchronous", () => {
  assert(/ASYNCHRONOUS/.test(action.description!), action.description);
  assert(/there is no move/.test(action.description!), action.description);
});
