import type { ActionDefinition } from "@w6w/types";
import { HuggingFaceClient, repoId } from "../lib/client.ts";

/**
 * `DELETE /api/repos/delete` — remove a repository.
 *
 * ## This is permanent, and it takes the history with it
 *
 * There is no archive and no undo. The repository, every revision, every LFS
 * object and the discussion threads all go. A model somebody else forked
 * survives in their copy; nothing else does.
 *
 * ## Anybody who pulled it still has it
 *
 * Deleting removes it from the Hub. It does not remove it from the machines,
 * caches and forks that already downloaded it, and for anything published for
 * any length of time the copies are the reality. Deletion is the right response
 * to a mistake and not a way to un-publish something.
 *
 * The confirmation asks for the full `namespace/name` again, because a wrong
 * value here destroys the wrong repository and the failure surfaces later, to
 * somebody else.
 */
const action: ActionDefinition = {
  key: "repo-delete",
  type: "perform",
  resource: "repository",
  title: "Delete a repository",
  description:
    "Permanently remove a repository and all its revisions. There is no undo, and anything " +
    "already downloaded or forked is unaffected.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Repository",
      type: "string",
      required: true,
      default: "",
      placeholder: "my-org/my-model",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "model",
      options: [
        { value: "model", label: "Model" },
        { value: "dataset", label: "Dataset" },
        { value: "space", label: "Space" },
      ],
    },
    {
      key: "confirmId",
      label: "Type the repository id again",
      type: "string",
      required: true,
      default: "",
      hint: "Must match exactly. Every revision and every LFS object goes with it, and there is " +
        "no archive to restore from.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Removed" },
    { key: "id", type: "string", label: "What was removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = repoId(p.id, "id");
    const confirm = String(p.confirmId ?? "").trim();
    if (confirm !== id) {
      throw new Error(
        `\`confirmId\` must match the repository id exactly — got "${confirm}" for "${id}". ` +
          "This destroys every revision and every LFS object, and there is no archive",
      );
    }

    const [namespace, name] = id.includes("/") ? id.split("/") : [undefined, id];
    await new HuggingFaceClient(ctx).request("/api/repos/delete", {
      method: "DELETE",
      body: { name, type: String(p.type ?? "model"), organization: namespace },
    });

    ctx.log("warn", "deleted a Hugging Face repository — permanently, with all its history", {
      type: p.type,
    });
    return { deleted: true, id };
  },
};

export default action;
