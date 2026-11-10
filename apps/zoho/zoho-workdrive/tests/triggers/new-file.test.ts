import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-file.ts";

const input = { params: { folderId: "d1" }, subscriptionId: "sub" };
const files = (n: number, from = 0) => ({
  body: {
    data: Array.from({ length: n }, (_, i) => ({
      id: `f${from + i}`,
      type: "files",
      attributes: { name: `File ${from + i}` },
    })),
  },
});

test("new-file seeds, reads every page by offset, then emits only the added file", async () => {
  const seedCtx = mockWorkDriveCtx([files(50), files(1, 50)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seedCtx.calls[0].method, "GET");
  assertEquals(new URL(seedCtx.calls[0].url).pathname, "/workdrive/api/v1/files/d1/files");
  const query = (i: number) => Object.fromEntries(new URL(seedCtx.calls[i].url).searchParams);
  assertEquals(query(0), { "page[limit]": "50", "page[offset]": "0" });
  assertEquals(query(1), { "page[limit]": "50", "page[offset]": "50" });
  const responses = () => [files(50), files(2, 50)];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockWorkDriveCtx(responses()).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockWorkDriveCtx(responses()).ctx,
  );
  assertEquals(first.events, [{ id: "f51", type: "files", attributes: { name: "File 51" } }]);
  assertEquals(retry, first);
});

test("new-file refuses a folder with more entries than it can read", async () => {
  const pages = Array.from({ length: 20 }, (_, i) => files(50, i * 50));
  let message = "";
  try {
    await trigger.poll!({ ...input, state: {} }, mockWorkDriveCtx(pages).ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("too many to watch"), `unexpected outcome: ${message}`);
});
