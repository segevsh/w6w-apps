import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import listApplicationStages from "../actions/list-application-stages.ts";
import listApplications from "../actions/list-applications.ts";
import listAttachments from "../actions/list-attachments.ts";
import listCandidates from "../actions/list-candidates.ts";
import listDepartments from "../actions/list-departments.ts";
import listJobInterviewStages from "../actions/list-job-interview-stages.ts";
import listJobPosts from "../actions/list-job-posts.ts";
import listJobs from "../actions/list-jobs.ts";
import listInterviews from "../actions/list-interviews.ts";
import listNotes from "../actions/list-notes.ts";
import listOffers from "../actions/list-offers.ts";
import listOffices from "../actions/list-offices.ts";
import listOpenings from "../actions/list-openings.ts";
import listRejectionReasons from "../actions/list-rejection-reasons.ts";
import listScorecards from "../actions/list-scorecards.ts";
import listSources from "../actions/list-sources.ts";
import listUsers from "../actions/list-users.ts";
import { pollWindow } from "../lib/window.ts";

const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const OVERLAP_MS = 120_000;
const SEEN_WINDOW = 2 * PAGE_SIZE * MAX_PAGES;

/** Clock seam for deterministic trigger tests. */
export const clock = { now: (): number => Date.now() };

type Item = Record<string, unknown>;
type Page = { items?: unknown[]; nextCursor?: string };

function makeTrigger(
  key: string,
  title: string,
  action: ActionDefinition,
  stamp: "created_at" | "updated_at",
): TriggerDefinition {
  const updated = stamp === "updated_at";
  return {
    key,
    title,
    description: `The run gets each ${updated ? "new or updated" : "new"} ${
      title.replace(/^(New|New or Updated) /, "").toLowerCase()
    }.`,
    output: [
      { key: "id", type: "number", label: "ID" },
      { key: stamp, type: "string", label: updated ? "Updated at" : "Created at" },
    ],
    sample: { id: 1, [stamp]: "2026-11-10T12:05:00Z" },
    minIntervalMs: 300_000,
    poll({ state }, ctx) {
      return pollWindow<Item, string>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: (item) =>
          `${String(item.id ?? "")}${updated ? `:${String(item.updated_at ?? "")}` : ""}`,
        tsOf: (item) => {
          const value = item[stamp];
          const ms = typeof value === "string" ? Date.parse(value) : NaN;
          return Number.isNaN(ms) ? undefined : ms;
        },
        async load(since, cursor) {
          const result = await action.execute(
            cursor ? { cursor } : {
              perPage: PAGE_SIZE,
              [updated ? "updatedAtOperator" : "createdAtOperator"]: "gte",
              [updated ? "updatedAt" : "createdAt"]: new Date(since).toISOString(),
            },
            ctx,
          ) as Page;
          return { items: (result.items ?? []) as Item[], next: result.nextCursor || undefined };
        },
      });
    },
  };
}

export const newApplicationStage = makeTrigger(
  "new-application-stage",
  "New Application Stage",
  listApplicationStages,
  "created_at",
);
export const newApplication = makeTrigger(
  "new-application",
  "New Application",
  listApplications,
  "created_at",
);
export const newAttachment = makeTrigger(
  "new-attachment",
  "New Attachment",
  listAttachments,
  "created_at",
);
export const newCandidate = makeTrigger(
  "new-candidate",
  "New Candidate",
  listCandidates,
  "created_at",
);
export const newDepartment = makeTrigger(
  "new-department",
  "New Department",
  listDepartments,
  "created_at",
);
export const newJobInterviewStage = makeTrigger(
  "new-job-interview-stage",
  "New Job Interview Stage",
  listJobInterviewStages,
  "created_at",
);
export const newJobPost = makeTrigger("new-job-post", "New Job Post", listJobPosts, "created_at");
export const newJob = makeTrigger("new-job", "New Job", listJobs, "created_at");
export const newNote = makeTrigger("new-note", "New Note", listNotes, "created_at");
export const newOffer = makeTrigger("new-offer", "New Offer", listOffers, "created_at");
export const newOffice = makeTrigger("new-office", "New Office", listOffices, "created_at");
export const newOpening = makeTrigger("new-opening", "New Opening", listOpenings, "created_at");
export const newRejectionReason = makeTrigger(
  "new-rejection-reason",
  "New Rejection Reason",
  listRejectionReasons,
  "created_at",
);
export const newScorecard = makeTrigger(
  "new-scorecard",
  "New Scorecard",
  listScorecards,
  "created_at",
);
export const newSource = makeTrigger("new-source", "New Source", listSources, "created_at");
export const newUser = makeTrigger("new-user", "New User", listUsers, "created_at");

export const newOrUpdatedApplicationStage = makeTrigger(
  "new-or-updated-application-stage",
  "New or Updated Application Stage",
  listApplicationStages,
  "updated_at",
);
export const newOrUpdatedApplication = makeTrigger(
  "new-or-updated-application",
  "New or Updated Application",
  listApplications,
  "updated_at",
);
export const newOrUpdatedAttachment = makeTrigger(
  "new-or-updated-attachment",
  "New or Updated Attachment",
  listAttachments,
  "updated_at",
);
export const newOrUpdatedCandidate = makeTrigger(
  "new-or-updated-candidate",
  "New or Updated Candidate",
  listCandidates,
  "updated_at",
);
export const newOrUpdatedDepartment = makeTrigger(
  "new-or-updated-department",
  "New or Updated Department",
  listDepartments,
  "updated_at",
);
export const newOrUpdatedInterview = makeTrigger(
  "new-or-updated-interview",
  "New or Updated Interview",
  listInterviews,
  "updated_at",
);
export const newOrUpdatedJobInterviewStage = makeTrigger(
  "new-or-updated-job-interview-stage",
  "New or Updated Job Interview Stage",
  listJobInterviewStages,
  "updated_at",
);
export const newOrUpdatedJobPost = makeTrigger(
  "new-or-updated-job-post",
  "New or Updated Job Post",
  listJobPosts,
  "updated_at",
);
export const newOrUpdatedJob = makeTrigger(
  "new-or-updated-job",
  "New or Updated Job",
  listJobs,
  "updated_at",
);
export const newOrUpdatedNote = makeTrigger(
  "new-or-updated-note",
  "New or Updated Note",
  listNotes,
  "updated_at",
);
export const newOrUpdatedOffer = makeTrigger(
  "new-or-updated-offer",
  "New or Updated Offer",
  listOffers,
  "updated_at",
);
export const newOrUpdatedOffice = makeTrigger(
  "new-or-updated-office",
  "New or Updated Office",
  listOffices,
  "updated_at",
);
export const newOrUpdatedOpening = makeTrigger(
  "new-or-updated-opening",
  "New or Updated Opening",
  listOpenings,
  "updated_at",
);
export const newOrUpdatedRejectionReason = makeTrigger(
  "new-or-updated-rejection-reason",
  "New or Updated Rejection Reason",
  listRejectionReasons,
  "updated_at",
);
export const newOrUpdatedScorecard = makeTrigger(
  "new-or-updated-scorecard",
  "New or Updated Scorecard",
  listScorecards,
  "updated_at",
);
export const newOrUpdatedSource = makeTrigger(
  "new-or-updated-source",
  "New or Updated Source",
  listSources,
  "updated_at",
);
export const newOrUpdatedUser = makeTrigger(
  "new-or-updated-user",
  "New or Updated User",
  listUsers,
  "updated_at",
);

export const pollTriggers = [
  newApplicationStage,
  newApplication,
  newAttachment,
  newCandidate,
  newDepartment,
  newJobInterviewStage,
  newJobPost,
  newJob,
  newNote,
  newOffer,
  newOffice,
  newOpening,
  newRejectionReason,
  newScorecard,
  newSource,
  newUser,
  newOrUpdatedApplicationStage,
  newOrUpdatedApplication,
  newOrUpdatedAttachment,
  newOrUpdatedCandidate,
  newOrUpdatedDepartment,
  newOrUpdatedInterview,
  newOrUpdatedJobInterviewStage,
  newOrUpdatedJobPost,
  newOrUpdatedJob,
  newOrUpdatedNote,
  newOrUpdatedOffer,
  newOrUpdatedOffice,
  newOrUpdatedOpening,
  newOrUpdatedRejectionReason,
  newOrUpdatedScorecard,
  newOrUpdatedSource,
  newOrUpdatedUser,
] as TriggerDefinition[];
