import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import serviceAccount from "./auth/service-account.ts";
import createSpace from "./actions/create-space.ts";
import getSpace from "./actions/get-space.ts";
import updateSpace from "./actions/update-space.ts";
import endActiveConference from "./actions/end-active-conference.ts";
import listSpaceMembers from "./actions/list-space-members.ts";
import getSpaceMember from "./actions/get-space-member.ts";
import listConferenceRecords from "./actions/list-conference-records.ts";
import getConferenceRecord from "./actions/get-conference-record.ts";
import listParticipants from "./actions/list-participants.ts";
import getParticipant from "./actions/get-participant.ts";
import listParticipantSessions from "./actions/list-participant-sessions.ts";
import getParticipantSession from "./actions/get-participant-session.ts";
import listRecordings from "./actions/list-recordings.ts";
import getRecording from "./actions/get-recording.ts";
import listTranscripts from "./actions/list-transcripts.ts";
import getTranscript from "./actions/get-transcript.ts";
import listTranscriptEntries from "./actions/list-transcript-entries.ts";
import getTranscriptEntry from "./actions/get-transcript-entry.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    createSpace,
    getSpace,
    updateSpace,
    endActiveConference,
    listSpaceMembers,
    getSpaceMember,
    listConferenceRecords,
    getConferenceRecord,
    listParticipants,
    getParticipant,
    listParticipantSessions,
    getParticipantSession,
    listRecordings,
    getRecording,
    listTranscripts,
    getTranscript,
    listTranscriptEntries,
    getTranscriptEntry,
  ],
  auth: [oauth2, serviceAccount],
  healthChecks: [service, quota],
} satisfies AppDefinition;
