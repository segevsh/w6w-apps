import type { AppDefinition } from "@w6w/types";
import botCreate from "./actions/bot-create.ts";
import botDelete from "./actions/bot-delete.ts";
import botDeleteMedia from "./actions/bot-delete-media.ts";
import botGet from "./actions/bot-get.ts";
import botLeaveCall from "./actions/bot-leave-call.ts";
import botList from "./actions/bot-list.ts";
import botOutputAudio from "./actions/bot-output-audio.ts";
import botPauseRecording from "./actions/bot-pause-recording.ts";
import botResumeRecording from "./actions/bot-resume-recording.ts";
import botSendChatMessage from "./actions/bot-send-chat-message.ts";
import botStartRecording from "./actions/bot-start-recording.ts";
import botStopRecording from "./actions/bot-stop-recording.ts";
import botUpdate from "./actions/bot-update.ts";
import calendarEventGet from "./actions/calendar-event-get.ts";
import calendarEventList from "./actions/calendar-event-list.ts";
import calendarEventScheduleBot from "./actions/calendar-event-schedule-bot.ts";
import calendarEventUnscheduleBot from "./actions/calendar-event-unschedule-bot.ts";
import calendarGet from "./actions/calendar-get.ts";
import calendarList from "./actions/calendar-list.ts";
import meetingMetadataList from "./actions/meeting-metadata-list.ts";
import participantEventsList from "./actions/participant-events-list.ts";
import recordingCreateTranscript from "./actions/recording-create-transcript.ts";
import recordingDelete from "./actions/recording-delete.ts";
import recordingGet from "./actions/recording-get.ts";
import recordingList from "./actions/recording-list.ts";
import transcriptDelete from "./actions/transcript-delete.ts";
import transcriptGet from "./actions/transcript-get.ts";
import transcriptList from "./actions/transcript-list.ts";
import usageGet from "./actions/usage-get.ts";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    botCreate,
    botDelete,
    botDeleteMedia,
    botGet,
    botLeaveCall,
    botList,
    botOutputAudio,
    botPauseRecording,
    botResumeRecording,
    botSendChatMessage,
    botStartRecording,
    botStopRecording,
    botUpdate,
    calendarEventGet,
    calendarEventList,
    calendarEventScheduleBot,
    calendarEventUnscheduleBot,
    calendarGet,
    calendarList,
    meetingMetadataList,
    participantEventsList,
    recordingCreateTranscript,
    recordingDelete,
    recordingGet,
    recordingList,
    transcriptDelete,
    transcriptGet,
    transcriptList,
    usageGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
