import { assert, assertEquals } from "@std/assert";
import { appPath, appPaths } from "./app-paths.ts";

Deno.test("pack discovery returns real apps at either depth, never provider/shared folders", () => {
  const paths = appPaths();
  assert(paths.includes("google/gmail"));
  assert(paths.includes("google/google-sheets"));
  assert(paths.includes("slack"));
  assert(!paths.includes("google"));
  assert(!paths.some((path) => path.includes("_shared")));
  assertEquals(new Set(paths).size, paths.length);
  const ids = new Set<string>();
  for (const path of paths) {
    const pkg = JSON.parse(
      Deno.readTextFileSync(
        new URL(`../apps/${path}/package.json`, import.meta.url),
      ),
    );
    assert(!ids.has(pkg.w6w.id), `duplicate app ID ${pkg.w6w.id}`);
    ids.add(pkg.w6w.id);
  }
});

Deno.test("CLI lookup accepts short names, provider paths and explicit fixture paths", () => {
  assertEquals(appPath("gmail"), "google/gmail");
  assertEquals(appPath("google/gmail"), "google/gmail");
  assertEquals(appPath("zoho"), "zoho/zoho");
  assertEquals(appPath("slack"), "slack");
  assertEquals(
    appPath("../_tools/_fixtures/example"),
    "../_tools/_fixtures/example",
  );
});
