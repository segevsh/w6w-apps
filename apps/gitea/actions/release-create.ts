import type { ActionDefinition } from "@w6w/types";
import { compact, GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `POST /repos/{owner}/{repo}/releases` — verified against Gitea's Swagger
 * document (`repoCreateRelease`; required `tag_name`).
 *
 * **This creates the tag if it does not exist.** `target_commitish` says where
 * to put it — a branch name or a commit sha — and left blank Gitea tags the
 * default branch's tip *at the moment the call runs*, which is not necessarily
 * the commit that was tested. For a release triggered by a pipeline, naming the
 * sha is the difference between shipping what you verified and shipping
 * whatever landed since.
 *
 * A **draft** release is not published and its tag is not created until it is;
 * a **prerelease** is published but marked. They are different switches and
 * both are off by default.
 */
const action: ActionDefinition = {
  key: "release-create",
  type: "perform",
  resource: "release",
  title: "Create a release",
  description: "Publish a release, creating its tag if needed.",
  // Gitea rejects a second release for the same tag.
  idempotent: false,
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "tagName",
      label: "Tag",
      type: "string",
      required: true,
      default: "",
      placeholder: "v1.4.0",
    },
    {
      key: "targetCommitish",
      label: "Target",
      type: "string",
      default: "",
      hint: "A branch or commit sha. Blank tags the default branch's tip AT CALL TIME, which " +
        "may not be the commit you tested.",
    },
    { key: "name", label: "Title", type: "string", default: "" },
    { key: "body", label: "Release Notes", type: "text", default: "" },
    {
      key: "draft",
      label: "Draft",
      type: "boolean",
      default: false,
      hint: "Unpublished — the tag is not created until it is published.",
    },
    { key: "prerelease", label: "Prerelease", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "number", label: "Release id" },
    { key: "tag_name", type: "string", label: "Tag" },
    { key: "name", type: "string", label: "Title" },
    { key: "draft", type: "boolean", label: "Draft" },
    { key: "prerelease", type: "boolean", label: "Prerelease" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const tagName = String(p.tagName ?? "").trim();
    if (!tagName) throw new Error("`tagName` is required");

    const body = compact({
      tag_name: tagName,
      target_commitish: p.targetCommitish,
      name: p.name,
      body: p.body,
    });
    // Both are meaningful when false.
    body.draft = p.draft === true;
    body.prerelease = p.prerelease === true;

    ctx.log("info", "creating a Gitea release", { owner, repo, tagName, draft: body.draft });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`,
      { method: "POST", body },
    );
  },
};

export default action;
