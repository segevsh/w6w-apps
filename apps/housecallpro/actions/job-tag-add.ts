import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /jobs/{job_id}/tags` — attach an existing tag to a job.
 *
 * It takes a `tag_id`, not a tag name: the tag has to exist first. Get Tags
 * lists them and Create Tag makes one.
 */
interface Input {
  jobId: string;
  tagId: string;
  companyId?: string;
}

const jobTagAdd: ActionDefinition<Input> = {
  key: "job-tag-add",
  type: "perform",
  resource: "job",
  title: "Add Job Tag",
  description:
    "Attach an existing tag to a job by tag id. Use Get Tags to find one, or Create Tag to make " +
    "it first.",
  // Tagging is set membership: applying the same tag twice leaves one tag.
  idempotent: true,
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    {
      key: "tagId",
      label: "Tag ID",
      type: "string",
      required: true,
      hint: "The tag's id, not its name.",
    },
    companyIdParam,
  ],
  output: [
    { key: "tags", type: "array", label: "Tags now on the job" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/jobs/${encodeId(input.jobId)}/tags`, {
      method: "POST",
      companyId: input.companyId,
      body: { tag_id: input.tagId },
    });
  },
};

export default jobTagAdd;
