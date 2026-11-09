import { assertEquals } from "@std/assert";
import { fromFileUrl, join } from "jsr:@std/path@^1.0.0";
import { GROUPS, syncShared } from "./sync-shared.ts";

const REPO = fromFileUrl(new URL("..", import.meta.url));

/** Copy `apps/_shared` and every group's `_shared` into a temp root (never touches the tree). */
async function tempRoot(): Promise<string> {
  const root = await Deno.makeTempDir({ prefix: "sync-shared-" });
  const copy = async (rel: string) => {
    const from = join(REPO, rel);
    const to = join(root, rel);
    await Deno.mkdir(join(to, ".."), { recursive: true });
    await Deno.mkdir(to, { recursive: true });
    for await (const e of Deno.readDir(from)) {
      if (e.isDirectory) await copy(join(rel, e.name));
      else await Deno.copyFile(join(from, e.name), join(to, e.name));
    }
  };
  await copy("apps/_shared");
  for (const g of GROUPS) await copy(`apps/${g}/_shared`);
  return root;
}

Deno.test("sync-shared: the committed tree has no drift", async () => {
  assertEquals(await syncShared(REPO, true), []);
});

Deno.test("sync-shared: one changed byte in a group copy is reported by file name", async () => {
  const root = await tempRoot();
  try {
    const file = join(root, "apps/google/_shared/poll/mod.ts");
    const bytes = await Deno.readFile(file);
    bytes[10] = bytes[10] ^ 1;
    await Deno.writeFile(file, bytes);
    assertEquals(await syncShared(root, true), [
      "apps/google/_shared/poll/mod.ts",
    ]);
    // --check wrote nothing; a real sync repairs it.
    assertEquals((await syncShared(root, false)).length, 1);
    assertEquals(await syncShared(root, true), []);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("sync-shared: a missing group copy is reported", async () => {
  const root = await tempRoot();
  try {
    await Deno.remove(join(root, "apps/twilio/_shared/poll"), {
      recursive: true,
    });
    assertEquals(await syncShared(root, true), [
      "apps/twilio/_shared/poll/mod.ts",
    ]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("sync-shared: the webhook kit is copied into every group", async () => {
  const canon = await Deno.readFile(join(REPO, "apps/_shared/webhook/mod.ts"));
  for (const g of GROUPS) {
    assertEquals(
      await Deno.readFile(join(REPO, `apps/${g}/_shared/webhook/mod.ts`)),
      canon,
    );
  }
});

Deno.test("sync-shared: a changed byte in a webhook copy is reported", async () => {
  const root = await tempRoot();
  try {
    const file = join(root, "apps/meta/_shared/webhook/mod.ts");
    const bytes = await Deno.readFile(file);
    bytes[10] = bytes[10] ^ 1;
    await Deno.writeFile(file, bytes);
    assertEquals(await syncShared(root, true), [
      "apps/meta/_shared/webhook/mod.ts",
    ]);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
