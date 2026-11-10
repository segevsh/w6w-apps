import applicationFeedbackList from "../actions/application-feedback-list.ts";
import applicationList from "../actions/application-list.ts";
import archiveReasonList from "../actions/archive-reason-list.ts";
import candidateNoteList from "../actions/candidate-note-list.ts";
import candidateSearch from "../actions/candidate-search.ts";
import departmentList from "../actions/department-list.ts";
import interviewEventList from "../actions/interview-event-list.ts";
import interviewScheduleList from "../actions/interview-schedule-list.ts";
import interviewStageList from "../actions/interview-stage-list.ts";
import jobList from "../actions/job-list.ts";
import jobPostingList from "../actions/job-posting-list.ts";
import locationList from "../actions/location-list.ts";
import offerList from "../actions/offer-list.ts";
import sourceList from "../actions/source-list.ts";
import userList from "../actions/user-list.ts";
import { recordTrigger } from "../lib/triggers.ts";

const rows = (field: string) => (result: unknown) =>
  (result as Record<string, unknown>)[field] as unknown[] ?? [];

export const newApplicationFeedback = recordTrigger({
  key: "new-application-feedback",
  title: "Application Feedback",
  action: applicationFeedbackList,
  items: rows("submissions"),
});
export const newApplication = recordTrigger({
  key: "new-application",
  title: "Application",
  action: applicationList,
  items: rows("applications"),
});
export const newArchiveReason = recordTrigger({
  key: "new-archive-reason",
  title: "Archive Reason",
  action: archiveReasonList,
  items: rows("reasons"),
});
export const newCandidateNote = recordTrigger({
  key: "new-candidate-note",
  title: "Candidate Note",
  action: candidateNoteList,
  items: rows("notes"),
});
export const newCandidateSearch = recordTrigger({
  key: "new-candidate-search-result",
  title: "Candidate Search Result",
  action: candidateSearch,
  items: rows("candidates"),
});
export const newDepartment = recordTrigger({
  key: "new-department",
  title: "Department",
  action: departmentList,
  items: rows("departments"),
});
export const newInterviewEvent = recordTrigger({
  key: "new-interview-event",
  title: "Interview Event",
  action: interviewEventList,
  items: rows("events"),
});
export const newInterviewSchedule = recordTrigger({
  key: "new-interview-schedule",
  title: "Interview Schedule",
  action: interviewScheduleList,
  items: rows("schedules"),
});
export const newInterviewStage = recordTrigger({
  key: "new-interview-stage",
  title: "Interview Stage",
  action: interviewStageList,
  items: rows("stages"),
});
export const newJob = recordTrigger({
  key: "new-job",
  title: "Job",
  action: jobList,
  items: rows("jobs"),
});
export const newJobPosting = recordTrigger({
  key: "new-job-posting",
  title: "Job Posting",
  action: jobPostingList,
  items: rows("postings"),
});
export const newLocation = recordTrigger({
  key: "new-location",
  title: "Location",
  action: locationList,
  items: rows("locations"),
});
export const newOffer = recordTrigger({
  key: "new-offer",
  title: "Offer",
  action: offerList,
  items: rows("offers"),
});
export const newSource = recordTrigger({
  key: "new-source",
  title: "Source",
  action: sourceList,
  items: rows("sources"),
});
export const newUser = recordTrigger({
  key: "new-user",
  title: "User",
  action: userList,
  items: rows("users"),
});
