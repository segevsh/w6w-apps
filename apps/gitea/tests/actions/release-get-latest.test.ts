import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-get-latest.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/** Not the first row of the list — `latest` skips drafts and prereleases. */
Deno.test("release-get-latest: reads the dedicated latest endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tag_name: "v1.4.0" } }], conn);
  const result = await action.execute!({ repo: "web" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/releases/latest");
  assertEquals(result.tag_name, "v1.4.0");
  assert(action.description!.includes("skipping drafts"), action.description);
});
