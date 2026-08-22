import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-copy.ts";

const copied = (done = true) => ({
  status: 200,
  body: {
    done,
    resource: { name: "archive/a.txt" },
    ...(done ? {} : { rewriteToken: "tok" }),
  },
});

const base = {
  sourceBucket: "uploads",
  sourceObject: "inbox/a.txt",
  destinationObject: "archive/a.txt",
};

Deno.test("object-copy: builds the copyTo path with both names encoded", async () => {
  const { ctx, calls } = mockCtx([copied()]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/storage/v1/b/uploads/o/inbox%2Fa.txt/copyTo/b/uploads/o/archive%2Fa.txt",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(result.name, "archive/a.txt");
  assertEquals(result.done, true);
});

Deno.test("object-copy: a blank destination bucket copies within the source", async () => {
  const { ctx, calls } = mockCtx([copied()]);
  await action.execute({ ...base, destinationBucket: "archive-bucket" }, ctx);
  assert(new URL(calls[0].url).pathname.includes("/copyTo/b/archive-bucket/"), calls[0].url);
});

/** A move is a copy and a delete, and this makes it one step. */
Deno.test("object-copy: deleting the source turns it into a move", async () => {
  const { ctx, calls } = mockCtx([copied(), { status: 204 }]);
  const result = await action.execute({ ...base, deleteSource: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(
    new URL(calls[1].url).pathname,
    "/storage/v1/b/uploads/o/inbox%2Fa.txt",
  );
  assertEquals(result.deletedSource, true);
});

/** Deleting the source of an unfinished copy loses the object entirely. */
Deno.test("object-copy: an unfinished copy is never followed by a delete", async () => {
  const { ctx, calls } = mockCtx([copied(false)]);
  let message = "";
  try {
    await action.execute({ ...base, deleteSource: true }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/the source has NOT been deleted/.test(message), message);
  assert(/lost between the two/.test(message), message);
  assertEquals(calls.length, 1);
});

Deno.test("object-copy: an unfinished copy without a delete reports the token", async () => {
  const { ctx } = mockCtx([copied(false)]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(result.done, false);
  assertEquals(result.rewriteToken, "tok");
});

/** With deleteSource on, this would delete what was just written. */
Deno.test("object-copy: copying an object onto itself is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute(
      { sourceBucket: "uploads", sourceObject: "a.txt", destinationObject: "a.txt" },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/the same object/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("object-copy: the precondition refuses to replace an existing destination", async () => {
  const { ctx, calls } = mockCtx([copied()]);
  await action.execute({ ...base, ifGenerationMatch: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("ifGenerationMatch"), "0");
});

Deno.test("object-copy: says there is no move", () => {
  assert(/because there is no move/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
