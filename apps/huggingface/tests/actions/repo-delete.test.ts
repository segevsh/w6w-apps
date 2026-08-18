import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repo-delete.ts";

/** A wrong value here destroys the wrong repository, for somebody else. */
Deno.test("repo-delete: refuses unless the id is typed again exactly", async () => {
  for (const confirm of [undefined, "", "acme/score", "ACME/SCORES"]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute({ id: "acme/scores", type: "model", confirmId: confirm }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmId` must match/.test(message), `${confirm}: ${message}`);
    assertEquals(calls.length, 0, "nothing is deleted without the confirmation");
  }
});

Deno.test("repo-delete: sends the name and namespace separately", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute(
    { id: "acme/scores", type: "dataset", confirmId: "acme/scores" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://huggingface.co/api/repos/delete");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "scores",
    type: "dataset",
    organization: "acme",
  });
  assertEquals(result.deleted, true);
  assertEquals(result.id, "acme/scores");
});

Deno.test("repo-delete: a bare id deletes under the token's own user", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ id: "scores", type: "model", confirmId: "scores" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "scores");
  assertEquals("organization" in body, false);
});

/** There is no archive and no undo. */
Deno.test("repo-delete: warns that it is permanent, without naming the repository", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ id: "acme/scores", type: "model", confirmId: "acme/scores" }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/permanently, with all its history/.test(logs[0].message), logs[0].message);
});

Deno.test("repo-delete: a repository that is already gone surfaces the 404", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Repo not found" } }]);
  let message = "";
  try {
    await action.execute({ id: "acme/gone", type: "model", confirmId: "acme/gone" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
});

/**
 * Deleting is the right response to a mistake, not a way to un-publish — the
 * copies that already exist are the reality.
 */
Deno.test("repo-delete: says what deleting does not undo", () => {
  assert(
    /already downloaded or forked is unaffected/.test(action.description!),
    action.description,
  );
  assertEquals(action.idempotent, true);
});
