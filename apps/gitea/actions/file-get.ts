import type { ActionDefinition } from "@w6w/types";
import { decodeBase64, GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/contents/{filepath}` — verified against Gitea's
 * Swagger document (`repoGetContents`).
 *
 * **The content comes back base64-encoded**, so this decodes it — and returns
 * the raw field too, because a binary file cannot be decoded to text and the
 * caller may want the bytes.
 *
 * **The `sha` in the response is the one every write needs.** Gitea's update
 * and delete endpoints require the blob sha of the file being replaced, as an
 * optimistic-concurrency guard: without the current one the write is rejected
 * rather than overwriting someone else's change. This action is where it comes
 * from.
 *
 * Pointed at a directory, Gitea answers an **array** of entries instead of a
 * file object, which is the shape surprise worth naming — `content` is then
 * absent rather than empty.
 */
const action: ActionDefinition = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get a file",
  description: "Read a file's contents and the sha that a later write needs.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "path",
      label: "Path",
      type: "string",
      required: true,
      default: "",
      placeholder: "src/index.ts",
      hint: "A directory path returns a LIST of entries instead of a file.",
    },
    {
      key: "ref",
      label: "Branch, Tag or Commit",
      type: "string",
      default: "",
      hint: "Blank reads the default branch.",
    },
  ],
  output: [
    { key: "path", type: "string", label: "Path" },
    { key: "sha", type: "string", label: "Blob sha — required to update or delete this file" },
    { key: "decodedContent", type: "string", label: "Contents, decoded from base64" },
    { key: "content", type: "string", label: "Contents as Gitea sent them (base64)" },
    { key: "encoding", type: "string", label: "Encoding" },
    { key: "size", type: "number", label: "Size in bytes" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const path = String(p.path ?? "").trim().replace(/^\/+/, "");
    if (!path) throw new Error("`path` is required");

    ctx.log("info", "reading a Gitea file", { owner, repo, path });

    const result = await new GiteaClient(ctx).request<
      { content?: string; encoding?: string } | unknown[]
    >(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${
        path.split("/").map(encodeURIComponent).join("/")
      }`,
      { query: { ref: (p.ref as string) || undefined } },
    );

    // A directory answers an array — there is nothing to decode.
    if (Array.isArray(result)) return result;
    if (result?.encoding === "base64" && typeof result.content === "string") {
      try {
        return { ...result, decodedContent: decodeBase64(result.content) };
      } catch {
        // Binary content is not text; the base64 is still there for the caller.
        return { ...result, decodedContent: undefined };
      }
    }
    return result;
  },
};

export default action;
