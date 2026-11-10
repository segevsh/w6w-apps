# Trigger coverage

<!-- Generated from TRIGGERS.json. Do not edit by hand: run
     `deno task --cwd _tools triggers --write` -->

Generated from [TRIGGERS.json](TRIGGERS.json) (the source of truth) by
`deno task --cwd _tools triggers --write`; `--check` fails when this file is stale.
Rows with `verified: false` come from a code scan or model knowledge, not vendor docs.
Shipped status is derived from code (`triggers/*.ts`), never stored here.

**Totals:** 683 apps — webhook-api: 62, manual-webhook: 18, poll: 417, none: 186

## webhook-api (62)

| app | candidates | verified | source | reason |
|---|---|---|---|---|
| apps/activecampaign | new-contact | apps/activecampaign/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/acuityscheduling | appointment-canceled, appointment-rescheduled, appointment-scheduled | apps/acuityscheduling/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/adyen | AUTHORISATION, CANCELLATION, CAPTURE, REFUND | apps/adyen/README.md Triggers section (verified 2026-11-10) | hand | webhook candidate queued for a webhook node: payment notifications; the only list actions are a per-shopper stored-payment-method lookup and a donation-campaign configuration lookup, not record feeds (https://docs.adyen.com/api-explorer/Checkout/latest/get/storedPaymentMethods) |
| apps/affinity | new-list-entry | apps/affinity/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/airparser | parsed-document | apps/airparser/README.md Triggers section (verified 2026-11-10) | hand | webhook candidate queued for a webhook node: parsed document delivery (airparser-signature HMAC, per-webhook signing secret); document-list has no documented order/response shape for polling |
| apps/asana | new-task, task-updated | apps/asana/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/atlassian/bitbucket | issue-created, pull-request-comment, pull-request-created, pull-request-declined, pull-request-merged, pull-request-updated, push | apps/atlassian/bitbucket/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/atlassian/trello | card-created, card-moved, card-updated, comment-added | apps/atlassian/trello/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/box | activity, file-uploaded | apps/box/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/brevo | new-contact | apps/brevo/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/brex | card.created, user.created | no | hand | webhook candidate queued for a webhook node: card.created, user.created |
| apps/cal | booking-cancelled, booking-created, booking-rescheduled | apps/cal/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/calendly | invitee-canceled, invitee-created | apps/calendly/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/clickup | task-comment-posted, task-created, task-deleted, task-updated | apps/clickup/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/clockify | new-client, new-project, new-task, new-time-entry, timer-started, timer-stopped | apps/clockify/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/cloudconvert | job.created, job.finished, job.failed | no | hand | webhook candidate queued for a webhook node: job.created, job.finished, job.failed |
| apps/copper | new-company, new-lead, new-opportunity, new-person, new-task, updated-opportunity, updated-person | apps/copper/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/eventbrite | activity, attendee-checked-in, attendee-checked-out, attendee-updated, event-created, event-published, event-unpublished, event-updated, order-placed, order-refunded, order-updated, organizer-updated, ticket-class-created, ticket-class-deleted, ticket-class-updated, venue-updated | no | hand | shipped: webhook registered through the vendor API |
| apps/figma | comment-added, file-deleted, file-updated, file-version-created, library-published | apps/figma/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/formstack | new-submission, new-submission-poll | apps/formstack/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/fullenrich | enrichment completion | apps/fullenrich/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: enrichment completion |
| apps/github | issue, issue-comment, pull-request, push, release, workflow-run | apps/github/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/gitlab | push, merge-request, issue, comment, pipeline, release | https://docs.gitlab.com/api/version/ and https://docs.gitlab.com/user/project/integrations/webhooks/ (conductor-verified 2026-11-09) | hand | API-registered project webhook (POST /projects/:id/hooks); onSubscribe probes GET /version: 19+ or probe failure registers signing_token only (Standard Webhooks HMAC-SHA256 over id.timestamp.raw body, 5 min window, X-Gitlab-Token never consulted); a server reporting < 19.0 registers a separate random token checked in constant time |
| apps/gocanvas | dispatch_create, submission_create, submission_edit, workflow_handoff_create, submission_custom_status_change | apps/gocanvas/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: submission_create, submission_edit, dispatch_create |
| apps/gumroad | new-sale, sale-webhook | apps/gumroad/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/heartbeat | USER_JOIN, USER_UPDATE, GROUP_JOIN, THREAD_CREATE, EVENT_CREATE, EVENT_RSVP, COURSE_COMPLETED, DOCUMENT_CREATE | apps/heartbeat/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: USER_JOIN, USER_UPDATE, GROUP_JOIN, THREAD_CREATE, EVENT_CREATE, EVENT_RSVP, COURSE_COMPLETED, DOCUMENT_CREATE (PUT /webhooks, unsigned, https://heartbeat.readme.io/reference/webhooks); member and content list endpoints are uncapped with no documented change filter |
| apps/helpscout | conversation-status-changed, customer-replied, new-conversation, new-customer | apps/helpscout/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/heygen | avatar_video.success, avatar_video.fail | apps/heygen/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: avatar_video.success, avatar_video.fail (HMAC-SHA256 `signature` header, registered via POST /v3/webhooks/endpoints, https://developers.heygen.com/docs/webhooks); the video list GET /v3/videos documents no result order, sort or since-filter (https://developers.heygen.com/reference/list-videos) |
| apps/invoiceninja | invoice-webhook, new-invoice | apps/invoiceninja/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/jotform | new-submission, submission-webhook | apps/jotform/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/lemlist | activity-webhook, new-activity | apps/lemlist/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/linear | comment, cycle, issue, project | apps/linear/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/lokalise | project, key, translation, task | no | hand | webhook candidate queued for a webhook node: project, key, translation and task events |
| apps/lusha | prospect, company-signal | no | hand | webhook candidate queued for a webhook node: prospect and company signal subscriptions |
| apps/mailchimp/mandrill | send, bounce, open, click, reject | no | hand | webhook candidate queued for a webhook node: send, bounce, open, click and reject events (https://mailchimp.com/developer/transactional/docs/webhooks/) |
| apps/mailerlite | campaign-sent, new-subscriber, subscriber-unsubscribed, subscriber-updated | apps/mailerlite/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/mailgun | email-event | apps/mailgun/README.md Triggers section (verified 2026-11-09) | hand | API-registered per-domain webhooks (POST /v3/domains/{domain}/webhooks), HMAC-SHA256 over timestamp+token, 300 s window; body not bound by the signature |
| apps/marketo | Smart Campaign lead events | no | hand | webhook candidate queued for a webhook node: Smart Campaign-triggered lead events |
| apps/mautic | contact-deleted, contact-updated, form-submitted, new-contact | apps/mautic/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/messagebird | inbound, message-status | no | hand | webhook candidate queued for a webhook node: inbound and message-status events |
| apps/meta/facebook-messenger | messaging, postback, delivery | no | hand | webhook candidate queued for a webhook node: messaging, postback and delivery events |
| apps/microsoft/azure-blob | BlobCreated, BlobDeleted | no | hand | webhook candidate queued for a webhook node: BlobCreated and BlobDeleted Event Grid events |
| apps/mighty-networks | member, post, event | no | hand | webhook candidate queued for a webhook node: member, post and event activity (https://docs.mightynetworks.com/api/webhooks.md) |
| apps/mindee | inference.processed | apps/mindee/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: processed inference jobs; existing actions have no account record list suitable for a new-record poll |
| apps/monday | create_pulse, change_column_value | apps/monday/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: board and item events; existing board/item lists have no documented newest-first order or creation-since filter |
| apps/murf | dubbing_job.completed | apps/murf/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: dubbing-job completion callbacks; voice and project lists lack documented new-record ordering or a since filter |
| apps/neverbounce | job.completed | apps/neverbounce/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: bulk-job completion callback; job search has no documented newest-first order |
| apps/onfleet | task-assigned, task-completed, task-created, task-failed, task-started, task-updated | apps/onfleet/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/opusclip | project.created | apps/opusclip/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: project-creation notifications (X-Opus-Signature HMAC-SHA256); clip-list needs a project/collection and has no order or since filter, collection-list and brand-template-list expose no size bound for a snapshot. |
| apps/patreon | members:pledge:create, posts:publish | apps/patreon/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: member and post events (HMAC-MD5 X-Patreon-Signature); members/posts feeds document no order or filter and list-campaigns returns the creator's one or few campaigns. |
| apps/paypal | event, invoice-paid, order-approved, payment-captured, payment-refunded, payout-item-succeeded | apps/paypal/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/pipedrive | new-deal | apps/pipedrive/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/shopify | customer-created, event, order-cancelled, order-created, order-fulfilled, order-paid, order-updated, product-created, product-updated, refund-created | apps/shopify/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/stripe | charge-refunded, checkout-completed, customer-created, event, invoice-paid, invoice-payment-failed, payment-failed, payment-succeeded, subscription-canceled, subscription-created | apps/stripe/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/surveymonkey | response-completed | apps/surveymonkey/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/telegram | new-message, update | apps/telegram/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/toggl | project-created, time-entry-created, time-entry-updated | apps/toggl/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/typeform | new-response | apps/typeform/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/webex | new-membership, new-message | apps/webex/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/webflow | collection-item-changed, collection-item-created, form-submission, new-order | apps/webflow/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/woocommerce | customer-created, event, order-created, order-deleted, order-updated, product-created, product-updated | apps/woocommerce/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/zendesk/zendesk | new-ticket, ticket-comment-added, ticket-status-changed | apps/zendesk/zendesk/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |

## manual-webhook (18)

| app | candidates | verified | source | reason |
|---|---|---|---|---|
| apps/clearout | bulk verification completed | no | hand | webhook candidate queued for a webhook node: email_verifier.bulk.completed, email_finder.bulk.completed (also instant and form_guard events); signed with x-co-webhook-signature (https://docs.clearout.io/developers/webhooks) |
| apps/cognitoforms | entry submitted | no | hand | webhook candidate queued for a webhook node: entry submitted |
| apps/customerio | customer-unsubscribed, email-clicked, email-opened, reporting-event | apps/customerio/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/formspark | submission.created | apps/formspark/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: submission.created |
| apps/goto-webinar | registrant, attendee, webinar | apps/goto-webinar/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: registrant, attendee, webinar events (https://developer.goto.com/GoToWebinarV2/); webinar-list filters scheduled time (fromTime/toTime), not creation or update time, and registrants/attendees are per-webinar |
| apps/highlevel | contact, appointment, opportunity, conversation | apps/highlevel/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: contact, appointment, opportunity, conversation events (https://marketplace.gohighlevel.com/docs/webhook/WebhookIntegrationGuide/index.html); GET /contacts/ documents no order or since-filter; pipelines/forms/calendars are rarely-changing account configuration, and /opportunities/search and /conversations/search order/date params are not sent by the existing actions |
| apps/homeassistant | webhook trigger | apps/homeassistant/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: automation webhook trigger (https://www.home-assistant.io/docs/automation/trigger/#webhook-trigger); state listing is an uncapped full instance snapshot with no change filter (https://developers.home-assistant.io/docs/api/rest/) |
| apps/intercom | conversation-created, contact-created | apps/intercom/README.md Triggers section (verified 2026-11-09) | hand | signed manual webhook (X-Hub-Signature HMAC-SHA1, client secret); no poll: conversation-get-many has no sort/since filter and no documented newest-first order |
| apps/meta/facebook | new-comment, page-feed | apps/meta/facebook/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/meta/facebook-lead-ads | new-lead | apps/meta/facebook-lead-ads/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/meta/whatsapp | message-received, message-status | apps/meta/whatsapp/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/netlify | deploy, deploy-failed, deploy-succeeded | https://docs.netlify.com/api/get-started/ (fetched 2026-11-09, T2.08) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/payhip | paid, refunded, subscription.created, subscription.deleted | apps/payhip/README.md Triggers section (verified 2026-11-09) | hand | webhook candidate queued for a webhook node: paid, refunded, subscription.created and subscription.deleted (help.payhip.com/article/115-webhooks); the Public API only verifies and manages a supplied license key, so no list action exists. |
| apps/slack | event, new-message | apps/slack/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/strava | activity-created, activity-deleted, activity-updated | apps/strava/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/todoist | task-added, task-completed, task-updated | apps/todoist/README.md Triggers section (verified 2026-11-09) | hand | signed manual webhook (X-Todoist-Hmac-SHA256 base64 HMAC-SHA256, client secret); no poll shipped: task-get-many has a free-form filter (created after:) but it is day-granular, active-only and unverified live (assumed) |
| apps/twilio/twilio | incoming-message, message-status | apps/twilio/twilio/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/wise | balance-updated, profile-state-changed, transfer-payout-failed, transfer-state-changed | apps/wise/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |

## poll (417)

| app | poll action | candidates | verified | source | reason |
|---|---|---|---|---|---|
| apps/2chat | messages-list | new-message | apps/2chat/README.md Triggers section (verified 2026-11-10) | hand | messages-list returns the newest 100 messages first (https://developers.2chat.co/docs/API/WhatsApp/Web/messages/get-messages); webhooks are separate and not shipped |
| apps/accelo | activity-list | new-activity, new-company, new-job | apps/accelo/README.md Triggers section (verified 2026-11-10) | hand | list actions take the documented order_by_desc(<field>) filter (https://api.accelo.com/docs/): activity-list, company-list, job-list polled newest-first by id; new-or-updated-activity orders activity-list by date_modified (documented order field) and keys on id:date_modified |
| apps/acculynx | job-list | new-job, new-or-updated-job | apps/acculynx/README.md Triggers section (verified 2026-11-09) | hand | Job list supports documented CreatedDate and ModifiedDate descending order (https://apidocs.acculynx.com/reference/getjobs). |
| apps/actionnetwork | person-list | new-person, new-or-updated-person | apps/actionnetwork/README.md Triggers section (verified 2026-11-09) | hand | People list supports documented created_date and modified_date filters with a rolling cursor (https://actionnetwork.org/docs/v2/). |
| apps/acumbamail | list-get-all | new-list | apps/acumbamail/README.md Triggers section (verified 2026-11-10) | hand | getLists returns every list in one request indexed by list ID (https://acumbamail.com/en/apidoc/function/getLists/); snapshot diff. campaigns-list not polled: getCampaigns documents only a dict 'List of campaigns' with no id keying or order |
| apps/addevent | event-template-list | new-event-template | apps/addevent/README.md Triggers section (verified 2026-11-09) | hand | Event-template list is documented newest-first (https://docs.addevent.com/reference/list-event-templates). |
| apps/agencyzoom | lead-list | new-lead | apps/agencyzoom/README.md Triggers section (verified 2026-11-09) | hand | Lead list supports the documented startDate creation-date filter with a rolling cursor (https://app.agencyzoom.com/openapi/agencyzoom.yaml). |
| apps/ahrefs | project-list | new-project | apps/ahrefs/README.md Triggers section (verified 2026-11-09) | hand | Project list is the bounded management-project collection, keyed by project_id (https://docs.ahrefs.com/en/api/reference/management/get-projects). |
| apps/aidbase | ticket-list | new-ticket | apps/aidbase/README.md Triggers section (verified 2026-11-09) | hand | Ticket-form list has a documented created_after filter, used with a rolling cursor (https://docs.aidbase.ai/apis/ticket-form-api/reference/). |
| apps/aircall | call-list | new-call | apps/aircall/README.md Triggers section (verified 2026-11-09) | hand | Call list supports documented descending order (https://developer.aircall.io/api-references/). |
| apps/airtable | search-records | new-record | apps/airtable/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action search-records |
| apps/alegra | contact-list | new-contact | apps/alegra/README.md Triggers section (verified 2026-11-09) | hand | Contact list supports descending ID order (https://developer.alegra.com/reference/listcontacts-1). |
| apps/algolia | index-list | new-index | apps/algolia/README.md Triggers section (verified 2026-11-09) | hand | Index list is a bounded account collection keyed by index name (https://www.algolia.com/doc/rest-api/search/list-indices). |
| apps/amplitude | cohort-list | new-cohort | apps/amplitude/README.md Triggers section (verified 2026-11-10) | hand | GET /api/3/cohorts returns the project's whole set of cohort definitions (https://amplitude.com/docs/apis/analytics/behavioral-cohorts); snapshot diff, added only. annotation-list not polled: project-wide list with no documented bound |
| apps/anchor | invoice-list | new-invoice | apps/anchor/README.md Triggers section (verified 2026-11-09) | hand | Invoice list supports descending issue-date order (https://docs.sayanchor.com/reference/listinvoices-1). |
| apps/anthropic | batch-list | new-batch | apps/anthropic/README.md Triggers section (verified 2026-11-10) | hand | batch-list returns 'Most recently created batches first' (https://platform.claude.com/docs/en/api/python/messages/batches/list); the API offers no batch webhook |
| apps/apify | actor-list | new-actor | apps/apify/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action actor-list |
| apps/apitemplateio | list-objects | new-object | apps/apitemplateio/README.md Triggers section (verified 2026-11-09) | hand | list-objects is documented by the existing action as a most-recent-first generated-object feed |
| apps/apollo | contact-search | new-contact, new-or-updated-contact | apps/apollo/README.md Triggers section (verified 2026-11-09) | hand | Contact search supports documented newest-created and newest-updated order (https://docs.apollo.io/reference/search-for-contacts). |
| apps/ashby | candidate-list | new-candidate | apps/ashby/README.md Triggers section (verified 2026-11-09) | hand | Candidate list supports the documented createdAfter creation-date filter with a rolling cursor (https://developers.ashbyhq.com/reference/candidatelist). |
| apps/assemblyai | transcript-list | new-transcript | apps/assemblyai/README.md Triggers section (verified 2026-11-09) | hand | AssemblyAI documents transcript-list as newest-to-oldest |
| apps/atlassian/confluence | page-list | new-page, new-or-updated-page | apps/atlassian/confluence/README.md Triggers section (verified 2026-11-09) | hand | Page list supports newest-created and newest-modified order (https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json). |
| apps/atlassian/jira | issue-search | new-issue | apps/atlassian/jira/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action issue-search |
| apps/atlassian/jira-data-center | comment-get-many | new-comment | apps/atlassian/jira-data-center/README.md Triggers section (verified 2026-11-09) | hand | Newest-first comment list per issue. |
| apps/atlassian/jira-service-management | servicedesk-get-many | new-service-desk, new-organization | apps/atlassian/jira-service-management/README.md Triggers section (verified 2026-11-10) | hand | servicedesk-get-many (GET /servicedesk, all service desks the user can access) and organization-get-many (GET /organization) are bounded id-keyed paged collections, polled as snapshots (https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/, .../api-group-organization/); request-search stays unpolled: ordered by latest activity, no created-since filter |
| apps/attio | list-tasks | new-task | apps/attio/README.md Triggers section (verified 2026-11-09) | hand | list-tasks with sort=created_at:desc pinned (https://docs.attio.com/rest-api/endpoint-reference/tasks/list-tasks) |
| apps/auth0 | log-list | new-log | apps/auth0/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action log-list |
| apps/authorize-net | list-customer-transactions | new-customer-transaction | apps/authorize-net/README.md Triggers section (verified 2026-11-09) | hand | Customer transaction list explicitly sorts by submit time descending. |
| apps/autotask | entity-query | new-ticket, new-or-updated-ticket | apps/autotask/README.md Triggers section (verified 2026-11-10) | hand | entity-query (POST /Tickets/query) takes a JSON filter, so createDate > cursor (new-ticket) and lastActivityDate > cursor (new-or-updated-ticket, keyed id:lastActivityDate) are documented since-filters over Tickets datetime fields (https://autotask.net/help/developerhelp/Content/APIs/REST/Entities/TicketsEntity.htm) |
| apps/avoma | meeting-list | new-meeting | apps/avoma/README.md Triggers section (verified 2026-11-09) | hand | meeting-list with o=-start_at, page_size=100 and a rolling from/to window; late-synced older meetings are a documented residual (https://dev.avoma.com/openapi.yml) |
| apps/aweber | subscriber-find | new-subscriber | apps/aweber/README.md Triggers section (verified 2026-11-09) | hand | subscriber-find with sort_key=subscribed_at, sort_order=desc pinned (https://api.aweber.com/) |
| apps/aws/s3 | bucket-list | new-bucket | apps/aws/s3/README.md Triggers section (verified 2026-11-10) | hand | ListBuckets returns every bucket in one call (https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html); snapshot diff. object-list is lexicographic by key, not by creation |
| apps/aws/ses | suppression-list | new-suppression, new-template, new-identity | apps/aws/ses/README.md Triggers section (verified 2026-11-10) | hand | ListSuppressedDestinations StartDate keeps addresses added after a date (https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_ListSuppressedDestinations.html); template-list and identity-list are per-region collections polled as snapshots |
| apps/axonaut | invoice-list | new-invoice, new-or-updated-invoice | apps/axonaut/README.md Triggers section (verified 2026-11-09) | hand | Invoice list has creation_date_after and updated_after filters (DD/MM/YYYY, date-only); triggers filter with a one-day overlap and dedupe by id (https://axonaut.com/api/v2/doc). |
| apps/balena | release-list | new-release | apps/balena/README.md Triggers section (verified 2026-11-09) | hand | release-list ($orderby=created_at desc, successful builds) wrapped; https://docs.balena.io/reference/api/resources/release/ |
| apps/bamboohr | list-employees | new-employee | apps/bamboohr/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-employees |
| apps/bannerbear | image-list | new-image | apps/bannerbear/README.md Triggers section (verified 2026-11-09) | hand | Bannerbear documents image-list as the recent image render feed |
| apps/baremetrics | customer-list | new-customer | apps/baremetrics/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-list |
| apps/base44 | list-audit-logs | new-audit-log | apps/base44/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-audit-logs |
| apps/basecamp | project-list | new-project | apps/basecamp/README.md Triggers section (verified 2026-11-10) | hand | GET /projects.json is 'sorted by most recently created project first' (https://github.com/basecamp/bc3-api/blob/master/sections/projects.md); message and to-do events are webhook-only and not shipped |
| apps/baserow | row-list | new-row | apps/baserow/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action row-list |
| apps/beehiiv | post-list | new-post | apps/beehiiv/README.md Triggers section (verified 2026-11-09) | hand | Post list supports created descending order. |
| apps/beeminder | list-datapoints | new-datapoint | apps/beeminder/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-datapoints |
| apps/betterstack | incident-list | new-incident | apps/betterstack/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: incident-list takes the documented from date (YYYY-MM-DD), 50 per page, id dedupe |
| apps/bexio | contact-list | new-contact | apps/bexio/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/bigcommerce | order-list | new-order | apps/bigcommerce/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action order-list |
| apps/bitly | list-bitlinks | new-bitlink | apps/bitly/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: list-bitlinks gained an additive createdAfter input for the documented created_after filter (https://dev.bitly.com/api-reference/) |
| apps/bitrix24 | contact-list | new-contact | apps/bitrix24/README.md Triggers section (verified 2026-11-09) | hand | Contact list accepts DATE_CREATE descending order. |
| apps/bitwarden | event-list | new-event | apps/bitwarden/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll windowed by the documented start filter of event-list with continuation tokens; order-independent, id dedupe |
| apps/blandai | call-list | new-call | apps/blandai/README.md Triggers section (verified 2026-11-09) | hand | The existing call-list action explicitly requests newest-first calls with ascending=false |
| apps/bloomerang | list-transactions | new-or-updated-transaction | apps/bloomerang/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: list-transactions takes lastModified (documented in Bloomerang's OpenAPI document); ids dedupe on Id + AuditTrail.LastModifiedDate |
| apps/bluesky | post-search | new-post | apps/bluesky/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action post-search |
| apps/boldsign | document-list | new-document | apps/boldsign/README.md Triggers section (verified 2026-11-09) | hand | Document list is newest activity first. |
| apps/booqable | customer-list | new-customer | apps/booqable/README.md Triggers section (verified 2026-11-09) | hand | Customer list accepts -created_at descending sort. |
| apps/braintree | transaction-search | new-transaction | apps/braintree/README.md Triggers section (verified 2026-11-09) | hand | Transaction search has a createdAt >= filter (createdFrom); the trigger filters cursor minus 120 s and dedupes by id, no default order assumed (https://developer.paypal.com/braintree/graphql/reference/). |
| apps/braze | campaign-list | new-or-updated-campaign | apps/braze/README.md Triggers section (verified 2026-11-09) | hand | Campaign list supports latest-edit descending order and update identity. |
| apps/breezyhr | candidate-search | new-candidate | apps/breezyhr/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action candidate-search |
| apps/browseai | task-list | new-task | apps/browseai/README.md Triggers section (verified 2026-11-09) | hand | Task list sorted explicitly with sort=-createdAt (vendor default is ascending), page size capped at 10 (https://docs.browse.ai/api/). |
| apps/browserless | crawl-list | new-crawl | apps/browserless/README.md Triggers section (verified 2026-11-09) | hand | Page-walk poll: the crawl listing documents no order, so the trigger walks nextCursor (10 pages) and dedupes on id; response array is crawls |
| apps/bubble | data-list | new-thing, new-or-updated-thing | apps/bubble/README.md Triggers section (verified 2026-11-09) | hand | new-thing sorts data-list by Created Date desc; new-or-updated-thing by Modified Date desc |
| apps/buffer | post-list | new-post | apps/buffer/README.md Triggers section (verified 2026-11-09) | hand | post-list sorted createdAt desc; Buffer only sorts by createdAt/dueAt so no updated feed |
| apps/callrail | call-list | new-call | apps/callrail/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action call-list |
| apps/campaignmonitor | list-subscribers-get | new-subscriber | apps/campaignmonitor/README.md Triggers section (verified 2026-11-09) | hand | active subscribers ordered by date desc; list-stats-get is analytics and unused |
| apps/canny | post-list | new-post | apps/canny/README.md Triggers section (verified 2026-11-09) | hand | post-list sort=newest; no updated-time sort |
| apps/canva | list-designs | new-design | apps/canva/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-designs |
| apps/capsulecrm | opportunity-list | new-opportunity, new-or-updated-opportunity | apps/capsulecrm/README.md Triggers section (verified 2026-11-09) | hand | since (changed-since) filter, no documented order: cursor window + id dedupe |
| apps/certifier | credential-search | new-credential, new-or-updated-credential | apps/certifier/README.md Triggers section (verified 2026-11-09) | hand | credential-search sorted createdAt/updatedAt desc |
| apps/chargebee | list-events | new-event | apps/chargebee/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-events |
| apps/chatwork | room-message-list | new-message | apps/chatwork/README.md Triggers section (verified 2026-11-09) | hand | force=1 returns the latest 100 messages, re-sorted by send_time desc |
| apps/checkly | check-result-list | new-check-result | apps/checkly/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: check-result-list takes documented from/to Unix timestamps; one check per subscription, FINAL results, optional failures only |
| apps/circle | event-list | new-event | apps/circle/README.md Triggers section (verified 2026-11-09) | hand | Admin API v2 documents default order newest by created_at; records array |
| apps/circleci | pipeline-list | new-pipeline | apps/circleci/README.md Triggers section (verified 2026-11-09) | hand | Page-walk poll: pipeline-list states no order, so the trigger walks next_page_token (10 pages), sorts by created_at and dedupes on id |
| apps/clerk | user-list | new-user, new-or-updated-user | apps/clerk/README.md Triggers section (verified 2026-11-09) | hand | order_by=-created_at / -updated_at via new optional orderBy input |
| apps/cleverreach | group-list | new-group | apps/cleverreach/README.md Triggers section (verified 2026-11-09) | hand | order=created DESC; changed-field name not verified so no updated trigger |
| apps/clickhouse | activity-list | new-activity | apps/clickhouse/README.md Triggers section (verified 2026-11-09) | hand | from_date filter, unpaged, id dedupe with cursor window |
| apps/clicksend | sms-history-list | new-sms | apps/clicksend/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action sms-history-list |
| apps/clientify | contact-list | new-contact, new-or-updated-contact, new-deal, new-or-updated-deal | apps/clientify/README.md Triggers section (verified 2026-11-09) | hand | Since-filter polls on the documented created[gte]/modified[gte] date filters of the contact and deal lists (https://developer.clientify.com) |
| apps/clio | contact-list | new-contact, new-or-updated-contact | apps/clio/README.md Triggers section (verified 2026-11-09) | hand | created_since / updated_since filters, id(asc) order: cursor window + id dedupe |
| apps/close | list-opportunities | new-opportunity | apps/close/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-opportunities |
| apps/cloudbeds | reservation-list | new-reservation, new-or-updated-reservation | apps/cloudbeds/README.md Triggers section (verified 2026-11-09) | hand | since-filter on reservation-list resultsFrom (booking date) / modifiedFrom, dedupe by reservationID (reservationID:dateModified for updated) |
| apps/cloudflare | dns-record-list | new-dns-record | apps/cloudflare/README.md Triggers section (verified 2026-11-09) | hand | Bounded snapshot: dns-record-list with per_page=5000 returns a zone's whole record set in one request (documented per_page max 5,000,000) |
| apps/cloudinary | asset-search | new-asset | apps/cloudinary/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action asset-search |
| apps/cloze | person-feed | new-or-updated-person, new-or-updated-company, new-or-updated-project | apps/cloze/README.md Triggers section (verified 2026-11-09) | hand | Change-feed polls on the cursored people/companies/projects feeds (pollToken); webhooks also exist, queued separately |
| apps/companycam | checklist-list | new-checklist, new-or-updated-checklist | apps/companycam/README.md Triggers section (verified 2026-11-09) | hand | checklist-list returns company checklists newest-updated first (page 1 of 50) |
| apps/connecteam | shift-list | new-shift | apps/connecteam/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action shift-list |
| apps/constantcontact | list-contact-lists | new-contact-list | apps/constantcontact/README.md Triggers section (verified 2026-11-09) | hand | bounded snapshot (<=500 lists, no sort or date filter exists); added-only |
| apps/contentful | list-entries | new-entry | apps/contentful/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-entries |
| apps/contentstack | list-assets | new-asset, new-or-updated-asset | apps/contentstack/README.md Triggers section (verified 2026-11-09) | hand | list-assets takes desc=created_at / desc=updated_at |
| apps/crisp | list-conversations | new-conversation, new-or-updated-conversation | apps/crisp/README.md Triggers section (verified 2026-11-09) | hand | since-filter on filter_date_start (additive optional action param); new-conversation keeps created_at in window, dedupe by session_id; updated dedupes by session_id:updated_at |
| apps/databricks | catalog-list | job-run-finished | no | survey | AT RISK: no runs action; 8 actions are catalog/sql only. Needs a new action first or blocker. |
| apps/datadog | log-search | new-log | apps/datadog/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action log-search |
| apps/dbtcloud | run-list | new-run | apps/dbtcloud/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action run-list |
| apps/deel | contract-list | new-contract | apps/deel/README.md Triggers section (verified 2026-11-09) | hand | order_direction=desc (sort key not stated by the vendor reference; creation order assumed) |
| apps/deputy | employee-search | new-employee, new-or-updated-employee | apps/deputy/README.md Triggers section (verified 2026-11-09) | hand | QUERY sort Id desc / Modified desc |
| apps/devin | session-list | new-session, new-or-updated-session | apps/devin/README.md Triggers section (verified 2026-11-09) | hand | since-filter created_after / updated_after (no sort), dedupe by session_id |
| apps/dialpad | call-list | new-call | apps/dialpad/README.md Triggers section (verified 2026-11-09) | hand | call-list is documented reverse-chronological by call start time |
| apps/digistore24 | list-purchases | new-purchase | apps/digistore24/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-purchases |
| apps/digitalocean | domain-record-list | new-domain-record | apps/digitalocean/README.md Triggers section (verified 2026-11-09) | hand | bounded snapshot (<=200 records per domain, no sort); added-only; larger domains fail loudly |
| apps/discourse | topic-list-latest | new-topic | apps/discourse/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action topic-list-latest |
| apps/docparser | results-list | new-result | apps/docparser/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action results-list |
| apps/document360 | workspace-article-list | new-article, new-or-updated-article | apps/document360/README.md Triggers section (verified 2026-11-09) | hand | bounded snapshot (max 1000 articles, 10 pages of 100) of workspace-article-list; added-only for new, added+updated via summary hash |
| apps/docusign | envelope-list | new-envelope, new-or-updated-envelope | apps/docusign/README.md Triggers section (verified 2026-11-09) | hand | order_by=created\|status_changed with order=desc and a 30-day from_date |
| apps/donorbox | event-list | new-event | apps/donorbox/README.md Triggers section (verified 2026-11-09) | hand | event-list takes the documented order=desc (default desc); first page holds the newest events |
| apps/dub | customer-list | new-customer | apps/dub/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-list |
| apps/duda | list-sites | new-site | apps/duda/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-sites |
| apps/easypost | event-list | new-event | apps/easypost/README.md Triggers section (verified 2026-11-09) | hand | events feed pages from the newest with before_id; start_datetime defaults to one month back |
| apps/ebay | item-search | new-listing | apps/ebay/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action item-search |
| apps/economic | invoice-booked-list | new-booked-invoice | apps/economic/README.md Triggers section (verified 2026-11-09) | hand | invoice-booked-list sorts -bookedInvoiceNumber (newest first) |
| apps/ecwid | customer-search | new-customer | apps/ecwid/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-search |
| apps/egnyte | link-list | new-link | apps/egnyte/README.md Triggers section (verified 2026-11-09) | hand | link-list has a created_after filter: since-filter shape with id dedupe (replaces round-1 search-based rejection) |
| apps/elastic | search | new-record | apps/elastic/README.md Triggers section (verified 2026-11-09) | hand | search sorted by a user-named creation timestamp field descending |
| apps/elevenlabs | voice-list | new-voice | apps/elevenlabs/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action voice-list |
| apps/encharge | segment-people-list | new-segment-person | apps/encharge/README.md Triggers section (verified 2026-11-09) | hand | segment-people-list sort+order=desc on a user-named creation-time person field (sort field name is user-supplied, not documented by the vendor) |
| apps/erpnext | list-documents | new-document, new-or-updated-document | apps/erpnext/README.md Triggers section (verified 2026-11-09) | hand | list-documents order_by creation desc / modified desc over a user-chosen DocType |
| apps/eztexting | contact-list | new-contact | apps/eztexting/README.md Triggers section (verified 2026-11-09) | hand | contact-list sort=created,desc is the documented example (https://developers.eztexting.com/reference/list-1) |
| apps/fathom | meeting-get-many | new-meeting | apps/fathom/README.md Triggers section (verified 2026-11-09) | hand | meeting-get-many lists meetings newest first, no sort arg |
| apps/fellow | action-item-list | new-action-item | apps/fellow/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action action-item-list |
| apps/fillout | submission-list | new-submission | apps/fillout/README.md Triggers section (verified 2026-11-09) | hand | submission-list sort=desc (default is asc) over a user-chosen form |
| apps/findymail | list-lists | new-list | apps/findymail/README.md Triggers section (verified 2026-11-09) | hand | list-lists is one unpaginated bounded response (contact lists): snapshot, additions only |
| apps/firestore | document-list | new-document | apps/firestore/README.md Triggers section (verified 2026-11-09) | hand | document-list orderBy a user-named creation timestamp field desc; Firestore has no built-in creation ordering |
| apps/float | allocation-list | new-allocation, new-or-updated-allocation | apps/float/README.md Triggers section (verified 2026-11-09) | hand | allocation-list sort=-created / -modified (a - prefix sorts descending) |
| apps/folk | list-groups | new-group | apps/folk/README.md Triggers section (verified 2026-11-09) | hand | unpaginated group collection is snapshotted for additions |
| apps/followupboss | search-people | new-person, new-or-updated-person | apps/followupboss/README.md Triggers section (verified 2026-11-09) | hand | search-people sorted -created / -updated (documented sort values, '-' = descending) |
| apps/formbricks | survey-list | new-survey | apps/formbricks/README.md Triggers section (verified 2026-11-09) | hand | workspace survey collection is snapshotted for additions |
| apps/formsite | result-list | new-result | apps/formsite/README.md Triggers section (verified 2026-11-09) | hand | result-list with sort_direction=desc on the documented default result_id sort |
| apps/formstack-documents | document-list | new-document | apps/formstack-documents/README.md Triggers section (verified 2026-11-09) | hand | unpaginated document template collection is snapshotted for additions |
| apps/freeagent | contact-list | new-contact, new-or-updated-contact | apps/freeagent/README.md Triggers section (verified 2026-11-09) | hand | contact-list sort=-created_at / -updated_at; identity is the contact url |
| apps/freshbooks | invoice-list | new-or-updated-invoice | apps/freshbooks/README.md Triggers section (verified 2026-11-09) | hand | polls invoice-list with documented search[updated_min] (day granularity) and dedupes on id+updated (https://www.freshbooks.com/api/invoices) |
| apps/freshworks/freshdesk | ticket-get-many | new-ticket, new-or-updated-ticket | apps/freshworks/freshdesk/README.md Triggers section (verified 2026-11-09) | hand | ticket-get-many order_by created_at/updated_at order_type=desc |
| apps/freshworks/freshsales | contact-get-many | new-contact, new-or-updated-contact | apps/freshworks/freshsales/README.md Triggers section (verified 2026-11-09) | hand | contact-get-many on a saved view, sort created_at/updated_at sort_type=desc |
| apps/freshworks/freshservice | ticket-get-many | new-ticket, new-or-updated-ticket | apps/freshworks/freshservice/README.md Triggers section (verified 2026-11-09) | hand | ticket-get-many order_type=desc for new; updated_since filter (since-filter poll) for updated |
| apps/front | contact-list | new-or-updated-contact | apps/front/README.md Triggers section (verified 2026-11-09) | hand | contact-list has only the q[updated_after] filter and no sort, so only a since-filter new-or-updated trigger fits |
| apps/gamma | list-gamma-comments | new-or-updated-gamma-comment | apps/gamma/README.md Triggers section (verified 2026-11-09) | hand | list-gamma-comments has the updatedSince filter and no sort, so only a since-filter new-or-updated trigger fits |
| apps/gerrit | change-search | new-or-updated-change | apps/gerrit/README.md Triggers section (verified 2026-11-09) | hand | change-search output is documented sorted most-recently-updated first; only the update-ordered trigger fits (no created-order sort documented) |
| apps/getresponse | contact-list | new-contact | apps/getresponse/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/ghost | list-posts | new-post | no | hand | shipped poll trigger(s) over list action list-posts |
| apps/gitea | pull-request-list | new-or-updated-pull-request | apps/gitea/README.md Triggers section (verified 2026-11-09) | hand | pull-request-list sort=recentupdate (documented sort enum has no created-order value), state=all; only the update-ordered trigger fits |
| apps/givebutter | contact-list | new-contact, new-or-updated-contact | apps/givebutter/README.md Triggers section (verified 2026-11-09) | hand | contact-list sortByDesc=created_at for new; updatedAfter filter (since-filter poll) for updated |
| apps/gladia | transcription-list | new-transcription | apps/gladia/README.md Triggers section (verified 2026-11-09) | hand | transcription-list has no documented order, so a since-filter poll on after_date |
| apps/glide | table-list | new-table | apps/glide/README.md Triggers section (verified 2026-11-09) | hand | Big Table collection is snapshotted for additions |
| apps/gocardless | list-customers | new-customer | apps/gocardless/README.md Triggers section (verified 2026-11-09) | hand | Newest-created customer page is polled. |
| apps/google/bigquery | job-list | new-job-list | apps/google/bigquery/README.md Triggers section (verified 2026-11-09) | hand | Existing jobs list is polled. |
| apps/google/gmail | get-many-messages | new-email | apps/google/gmail/README.md Triggers section (verified 2026-11-09) | hand | gmail users.messages.list with q=after:<epoch>; H-1 |
| apps/google/google-business-profile | list-questions | new-question | apps/google/google-business-profile/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-questions |
| apps/google/google-calendar | list-events | event-changed | apps/google/google-calendar/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-events |
| apps/google/google-contacts | list-contact-groups | new-contact-group | apps/google/google-contacts/README.md Triggers section (verified 2026-11-09) | hand | Contact groups page of 200 (fits the kit's seen window) is polled; order undocumented. |
| apps/google/google-drive | file-list | new-file | apps/google/google-drive/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action file-list |
| apps/google/google-forms | list-forms | new-form, new-or-updated-form | apps/google/google-forms/README.md Triggers section (verified 2026-11-09) | hand | Drive forms are ordered by created or modified time. |
| apps/google/google-meet | list-conference-records | new-conference-record | apps/google/google-meet/README.md Triggers section (verified 2026-11-09) | hand | conference records are documented newest-started-first |
| apps/google/google-sheets | sheet-read | row-added, row-added-or-updated, row-updated | apps/google/google-sheets/README.md Triggers section (verified 2026-11-09) | hand | poll sheet-read, diff rows against seeded snapshot |
| apps/google/google-tasks | list-tasks | new-or-updated-task | apps/google/google-tasks/README.md Triggers section (verified 2026-11-09) | hand | tasks.list supports updatedMin and the trigger deduplicates a bounded overlap |
| apps/google/googlechat | list-messages | new-message | apps/google/googlechat/README.md Triggers section (verified 2026-11-09) | hand | Messages are requested in descending create-time order. |
| apps/google/youtube | list-comment-threads | new-comment-thread | apps/google/youtube/README.md Triggers section (verified 2026-11-09) | hand | Comment threads are requested in time order. |
| apps/gorgias | customer-get-many | new-customer, new-or-updated-customer | apps/gorgias/README.md Triggers section (verified 2026-11-09) | hand | Customers support created and updated descending ordering. |
| apps/gotify | message-list | new-message | apps/gotify/README.md Triggers section (verified 2026-11-09) | hand | Existing bounded messages page is polled. |
| apps/grafana | dashboard-list | new-dashboard | apps/grafana/README.md Triggers section (verified 2026-11-09) | hand | dashboard search is capped at 5,000 records and is snapshotted for added dashboards (https://grafana.com/docs/grafana/latest/developers/http_api/folder_dashboard_search/); read to the 5,000 limit, so dashboards beyond it are neither seen nor reported |
| apps/grain | recording-list | new-recording | apps/grain/README.md Triggers section (verified 2026-11-09) | hand | Recording list documents no order; polled with filter.after_datetime since-filter plus id dedupe (shape b); filter direction unverifiable live. |
| apps/granola | audit-event-list | new-audit-event | apps/granola/README.md Triggers section (verified 2026-11-09) | hand | Audit log is oldest-first with page_size max 30; polled with occurred_after since-filter plus id dedupe (shape b). |
| apps/gravityforms | entry-get-many | new-entry, new-or-updated-entry | apps/gravityforms/README.md Triggers section (verified 2026-11-09) | hand | Entries support created and updated descending ordering. |
| apps/greenhouse | list-interviews | new-interview | apps/greenhouse/README.md Triggers section (verified 2026-11-09) | hand | Harvest v3 interviews documents no order; polled with created_at gte since-filter, cursor paging and id dedupe (shape b). |
| apps/guru | card-search | new-card | apps/guru/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action card-search |
| apps/gusto | event-list | new-event | apps/gusto/README.md Triggers section (verified 2026-11-09) | hand | shape a: event-list now takes sort_order and the trigger sends sort_order=desc (https://docs.gusto.com/app-integrations/docs/events: asc default, desc supported, 30-day window) |
| apps/hackernews | list-new-stories | new-story | apps/hackernews/README.md Triggers section (verified 2026-11-09) | hand | the official API documents /v0/newstories.json as the newest stories, capped at 500 ids; event is {id} (https://github.com/HackerNews/API) |
| apps/harvest | task-get-many | new-task | apps/harvest/README.md Triggers section (verified 2026-11-09) | hand | Task page exposes stable task IDs. |
| apps/hex | user-list | new-user | apps/hex/README.md Triggers section (verified 2026-11-09) | hand | shape c: /v1/users has only NAME/EMAIL sorts, so the trigger walks every page (limit 500, after cursor) and snapshots user ids; walk past the 5000-row cap throws (https://static.hex.site/openapi.json) |
| apps/heyreach | list-get-leads | new-lead | apps/heyreach/README.md Triggers section (verified 2026-11-09) | hand | shape b: createdFrom since-filter (cursor minus 2 min) on list-get-leads, every page of the window read, deduped by lead id (https://docs.heyreach.io/openapi.json) |
| apps/hibob | tasks-list | new-task | apps/hibob/README.md Triggers section (verified 2026-11-09) | hand | the task endpoint caps one response at 5,000 open tasks and is snapshotted for additions (https://apidocs.hibob.com/reference); the 5,000 bound is the trigger's own snapshot cap, above it the check fails with a cap error |
| apps/honeybook | project-list | new-project | no | hand | shipped poll trigger(s) over list action project-list |
| apps/hospitable | reservation-list | new-reservation | apps/hospitable/README.md Triggers section (verified 2026-11-09) | hand | Reservations can be requested newest booked first with stable IDs. |
| apps/hostaway | list-reservations | new-reservation | no | hand | shipped poll trigger(s) over list action list-reservations |
| apps/hotmart | product-list | new-product | apps/hotmart/README.md Triggers section (verified 2026-11-09) | hand | shape c: product-list documents max_results/page_token/next_page_token and no sort, so the trigger walks the creator's catalogue and snapshots product ids (https://developers.hotmart.com/docs/en/v1/product/product-list/) |
| apps/housecallpro | customer-list | new-customer | apps/housecallpro/README.md Triggers section (verified 2026-11-09) | hand | Customers are sorted newest created first with stable IDs. |
| apps/hubspot | search-contacts | new-contact | apps/hubspot/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action search-contacts |
| apps/hubstaff | project-list | new-project | apps/hubstaff/README.md Triggers section (verified 2026-11-09) | hand | shape c: projects endpoint has page_start_id/page_limit and no sort, so the trigger walks every page (status=all) and snapshots project ids (https://api.hubstaff.com/v2/docs) |
| apps/huggingface | inference-model-list | new-inference-model | apps/huggingface/README.md Triggers section (verified 2026-11-09) | hand | shape c: router /v1/models is one unordered response of a few hundred provider-deployed models; snapshot on model id (https://huggingface.co/docs/hub/api) |
| apps/hunter | lead-list | new-lead | apps/hunter/README.md Triggers section (verified 2026-11-09) | hand | Lead list is most recent first and exposes stable IDs. |
| apps/hyros | leads-list | new-lead, new-sale | apps/hyros/README.md Triggers section (verified 2026-11-09) | hand | leads-list and sales-list take the documented fromDate (only records whose join date is more recent) with an opaque nextPageId cursor: since-filter + id dedupe; no update stamp, so no new-or-updated (https://jsapi.apiary.io/apis/hyros.apib) |
| apps/iclosed | deal-list | new-deal | no | hand | shipped poll trigger(s) over list action deal-list |
| apps/inoreader | stream-contents | new-article | apps/inoreader/README.md Triggers section (verified 2026-11-09) | hand | shape a: stream/contents r defaults to newest first, order=newest sends no r (https://www.inoreader.com/developers/stream-contents) |
| apps/insightly | contact-get-many | new-contact, new-lead, new-opportunity, new-organisation, new-or-updated-contact, new-or-updated-lead, new-or-updated-opportunity, new-or-updated-organisation | apps/insightly/README.md Triggers section (verified 2026-11-09) | hand | *-get-many on GET /{Object}/Search with the documented optional updated_after_utc (field_name/field_value optional), since-filter + id dedupe, new-or-updated keyed id:DATE_UPDATED_UTC (https://api.na1.insightly.com/v3.1/swagger/docs/v3.1); no live webhook doc found, so none recorded |
| apps/instantly | email-list | new-email | apps/instantly/README.md Triggers section (verified 2026-08-29) | hand | shipped poll trigger(s) over list action email-list |
| apps/ironclad | record-list | new-record, new-or-updated-record | apps/ironclad/README.md Triggers section (verified 2026-11-09) | hand | Records support descending agreement-date and last-updated sorts with stable IDs. |
| apps/iterable | list-campaigns | new-campaign | apps/iterable/README.md Triggers section (verified 2026-10-06) | hand | shipped poll trigger(s) over list action list-campaigns |
| apps/jibble | activity-list | new-activity | apps/jibble/README.md Triggers section (verified 2026-11-09) | hand | shape a: Activity has createdAt (OData $metadata), trigger sends $orderby=createdAt desc (https://workspace.prod.jibble.io/v1/$metadata) |
| apps/jobber | invoice-list | new-invoice, new-or-updated-invoice | apps/jobber/README.md Triggers section (verified 2026-11-09) | hand | invoice-list sorted by CREATED_AT / UPDATED_AT descending (sort keys pinned in the request; Jobber docs host returns 403 to automated fetch, https://developer.getjobber.com/docs/) |
| apps/jobnimbus | contact-list | new-contact, new-or-updated-contact | apps/jobnimbus/README.md Triggers section (verified 2026-11-09) | hand | contact-list sorted by date_created / date_updated descending (https://documenter.getpostman.com/view/3919598/S11PpG4x) |
| apps/jobtread | list-jobs | new-job | no | hand | shipped poll trigger(s) over list action list-jobs |
| apps/jumpcloud | user-list | new-user | apps/jumpcloud/README.md Triggers section (verified 2026-11-09) | hand | user-list (V1 /systemusers) sorted -created; V2 user-group-list dropped, UserGroup schema has no creation field (https://docs.jumpcloud.com/api/2.0/index.yaml) |
| apps/justcall | contact-list | new-contact | apps/justcall/README.md Triggers section (verified 2026-11-09) | hand | contact-list order=desc by contact id, documented as most-recently-added first (https://developer.justcall.io/reference/contacts_list_v21) |
| apps/kajabi | contact-list | new-contact | apps/kajabi/README.md Triggers section (verified 2026-11-09) | hand | contact-list sort=-created_at, default documented newest-first (https://github.com/Kajabi/public_api_docs/blob/main/openapi.yaml) |
| apps/keap | contact-list | new-contact | apps/keap/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/kintone | comments-list | new-comment | apps/kintone/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action comments-list |
| apps/kit | list-subscribers | new-subscriber | apps/kit/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-subscribers |
| apps/knack | record-list | new-record | apps/knack/README.md Triggers section (verified 2026-11-09) | hand | record-list sorted descending by a caller-named creation-time field (sort_field / sort_order, https://docs.knack.com/reference/sorting) |
| apps/kommo | lead-list | new-lead | apps/kommo/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action lead-list |
| apps/kudosity | sms-list | new-sms | no | hand | shipped poll trigger(s) over list action sms-list |
| apps/kustomer | customer-list | new-customer, new-or-updated-customer | apps/kustomer/README.md Triggers section (verified 2026-11-09) | hand | customer-list sort=-createdAt / -updatedAt (https://developer.kustomer.com/api/core-resources/get-customers) |
| apps/lawmatics | list-contacts | new-contact | apps/lawmatics/README.md Triggers section (verified 2026-11-09) | hand | list-contacts sort_by=created_at&sort_order=desc (https://docs.lawmatics.com/api/collections/26379991/2sA3JM7gbw) |
| apps/leexi | meeting-event-list | new-meeting-event | no | hand | shipped poll trigger(s) over list action meeting-event-list |
| apps/lemonsqueezy | order-list | new-order | apps/lemonsqueezy/README.md Triggers section (verified 2026-11-09) | hand | order-list relies on the documented created_at-descending default (https://docs.lemonsqueezy.com/api/orders/list-all-orders) |
| apps/lever | posting-list | new-posting, new-or-updated-posting | apps/lever/README.md Triggers section (verified 2026-11-09) | hand | posting-list read as a bounded whole-collection snapshot (cursor pages of 100, max 5000), no sort relied on (https://hire.lever.co/developer/documentation#list-all-postings) |
| apps/lexware-office | voucher-list | new-voucher, new-or-updated-voucher | apps/lexware-office/README.md Triggers section (verified 2026-11-09) | hand | voucher-list sort=createdDate,DESC / updatedDate,DESC (https://developers.lexware.io/docs/) |
| apps/linkedin/linkedin | list-posts-by-author | new-post, new-or-updated-post | apps/linkedin/linkedin/README.md Triggers section (verified 2026-11-09) | hand | list-posts-by-author sortBy=CREATED / LAST_MODIFIED (https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) |
| apps/linkedin/linkedin-ads | ad-account-list | new-ad-account | apps/linkedin/linkedin-ads/README.md Triggers section (verified 2026-11-09) | hand | ad-account-list read as a bounded whole-collection snapshot via pageToken (https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/account-structure/create-and-manage-accounts) |
| apps/linkupapi | job-candidates-list | new-candidate | no | hand | shipped poll trigger(s) over list action job-candidates-list |
| apps/littlegreenlight | constituent-search | new-constituent, new-or-updated-constituent | apps/littlegreenlight/README.md Triggers section (verified 2026-11-09) | hand | constituent-search sorted date_created! / date_updated! (vendor sort param, trailing ! reverses), limit 100; updated variant ids id:updated_at (vendor field; date_updated is only the sort key) |
| apps/livestorm | event-list | new-event, new-or-updated-event | apps/livestorm/README.md Triggers section (verified 2026-11-09) | hand | since-filter poll: filter[created_since]/[updated_since]=cursor-120s over event-list, page[number] 0-indexed, id dedupe |
| apps/lofty | lead-list | new-lead | apps/lofty/README.md Triggers section (verified 2026-11-09) | hand | lead-list sort=CreateTime desc=true limit 100; id leadId (vendor reference is client-rendered, sort value rests on the action's documented list) |
| apps/loop-returns | order-list | new-order | no | hand | shipped poll trigger(s) over list action order-list |
| apps/loops | transactional-list | new-transactional | apps/loops/README.md Triggers section (verified 2026-11-09) | hand | vendor: list transactional emails 'most recently created first' (https://loops.so/docs/api-reference/list-transactional-emails) |
| apps/loyverse | receipt-list | new-receipt, new-or-updated-receipt | apps/loyverse/README.md Triggers section (verified 2026-11-09) | hand | new-receipt: receipt-list newest first per the action; updated: updated_at_min=cursor-120s following the vendor cursor, ids id:updated_at |
| apps/luma | calendar-events-list | new-calendar-event | apps/luma/README.md Triggers section (verified 2026-11-09) | hand | sortDirection=desc on the only vendor sort column start_at; ordered by START time, documented limit (https://docs.luma.com/reference/get_v1-calendars-events-list) |
| apps/mailchimp/mailchimp | list-members | new-member | apps/mailchimp/mailchimp/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-members |
| apps/maileroo | list-domains | new-domain | no | hand | shipped poll trigger(s) over list action list-domains |
| apps/mailersend | list-sender-identities | new-sender-identity | apps/mailersend/README.md Triggers section (verified 2026-11-09) | hand | order_by=created_at&order=desc (vendor default asc) per developers.mailersend.com sender-identity page |
| apps/mailjet | list-messages | new-message | apps/mailjet/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-messages |
| apps/maintainx | workorder-list | new-work-order, new-or-updated-work-order | apps/maintainx/README.md Triggers section (verified 2026-11-09) | hand | GET /workorders explicit sort=-createdAt / -updatedAt per vendor OpenAPI; user-list dropped (no documented order) |
| apps/manus | task-list | new-task | apps/manus/README.md Triggers section (verified 2026-11-09) | hand | order=desc is newest first by creation time (https://open.manus.ai/docs/v2/task.list) |
| apps/manychat | list-flows | new-flow | apps/manychat/README.md Triggers section (verified 2026-11-09) | hand | getFlows returns the Page's whole flow set in one call: pollSnapshot, added only |
| apps/mastodon | notification-list | new-notification | apps/mastodon/README.md Triggers section (verified 2026-11-09) | hand | notification-list is newest-first and supports forward paging with min_id |
| apps/matrix | get-messages | new-room-message | apps/matrix/README.md Triggers section (verified 2026-11-09) | hand | get-messages supports backwards (newest-first) room timeline paging; trigger keeps only m.room.message events (https://spec.matrix.org/latest/client-server-api/) |
| apps/mattermost | posts-for-channel | new-post | apps/mattermost/README.md Triggers section (verified 2026-11-09) | hand | since=cursor-120s ms (vendor: all posts modified since, ordered by create time, <=1000, no paging); read order.map(id=>posts[id]), create_at filter drops edits |
| apps/meilisearch | task-list | new-task | apps/meilisearch/README.md Triggers section (verified 2026-11-09) | hand | vendor: tasks returned in descending uid order by default (https://www.meilisearch.com/docs/reference/api/tasks/list-tasks); search/document-list/index-list unused |
| apps/meistertask | checklist-item-list | new-checklist-item | apps/meistertask/README.md Triggers section (verified 2026-11-09) | hand | sort=-id (vendor: '-' prefix descending, default ascending id) per developers.meistertask.com sorting page |
| apps/mem | task-list | new-task, new-or-updated-task | apps/mem/README.md Triggers section (verified 2026-11-09) | hand | task-list with order_by=created_at and order_by=updated_at (id includes updated_at); both documented in Mem's OpenAPI. |
| apps/memberstack | member-list | new-member | no | hand | shipped poll trigger(s) over list action member-list |
| apps/mercury | customer-list | new-customer | apps/mercury/README.md Triggers section (verified 2026-11-09) | hand | Customers requested in descending order. |
| apps/meta/instagram-for-business | list-media | new-media | apps/meta/instagram-for-business/README.md Triggers section (verified 2026-11-09) | hand | Media edge is documented as most recent first. |
| apps/microsoft/azuredevops | build-list | new-build, new-work-item, new-or-updated-work-item | apps/microsoft/azuredevops/README.md Triggers section (verified 2026-11-09) | hand | build-list takes a minTime filter (id dedupe, no default-order reliance); work-item-query runs trigger-built WIQL with explicit ORDER BY CreatedDate/ChangedDate DESC (https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax) |
| apps/microsoft/excel | list-workbooks | new-workbook, new-or-updated-workbook | apps/microsoft/excel/README.md Triggers section (verified 2026-11-09) | hand | list-workbooks with createdDateTime desc and lastModifiedDateTime desc (id includes the stamp). |
| apps/microsoft/microsoft-entra-id | list-deleted-items | new-deleted-item | apps/microsoft/microsoft-entra-id/README.md Triggers section (verified 2026-11-09) | hand | Deleted items are requested by deletedDateTime descending. |
| apps/microsoft/onedrive | list-changes | file-changed | no | hand | shipped poll trigger(s) over list action list-changes |
| apps/microsoft/onenote | list-pages | new-or-updated-page | apps/microsoft/onenote/README.md Triggers section (verified 2026-11-09) | hand | Page feed is documented as last-modified descending; update stamp is part of id. |
| apps/microsoft/outlook | list-messages | new-email | apps/microsoft/outlook/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-messages |
| apps/microsoft/powerbi | list-refresh-history | new-refresh, new-or-updated-refresh | apps/microsoft/powerbi/README.md Triggers section (verified 2026-11-09) | hand | refresh history is a bounded collection (20-60 entries per dataset) with stable requestId (https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-refresh-history) |
| apps/microsoft/sharepoint | list-items | new-list-item | no | hand | shipped poll trigger(s) over list action list-items |
| apps/microsoft/teams | list-channel-messages | new-channel-message | apps/microsoft/teams/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-channel-messages |
| apps/millionverifier | bulk-list-files | new-bulk-file, new-or-updated-bulk-file | apps/millionverifier/README.md Triggers section (verified 2026-11-09) | hand | bulk-list-files takes createdate_from / updated_at_from since-filters (yyyy-MM-dd HH:mm:ss, written by the trigger itself); id file_id (https://developer.millionverifier.com/) |
| apps/miro | board-list | new-board | apps/miro/README.md Triggers section (verified 2026-11-09) | hand | board-list sort=last_created with required teamId (Miro honours sort only within a team or project). |
| apps/missive | contact-list | new-or-updated-contact | apps/missive/README.md Triggers section (verified 2026-11-09) | hand | Contacts are requested with last_modified ordering and update stamp ids. |
| apps/mixmax | unsubscribe-list | new-unsubscribe | no | hand | shipped poll trigger(s) over list action unsubscribe-list |
| apps/mixpanel | cohort-list | new-cohort | apps/mixpanel/README.md Triggers section (verified 2026-11-09) | hand | Saved cohorts are a small bounded collection; pollSnapshot emits a cohort when its id first appears. |
| apps/moco | contact-list | new-or-updated-contact | apps/moco/README.md Triggers section (verified 2026-11-09) | hand | contact-list updated_after set to cursor minus 2 min overlap, id includes updated_at (shape b). |
| apps/mollie | customer-list | new-customer | apps/mollie/README.md Triggers section (verified 2026-11-09) | hand | Customers are requested in descending order. |
| apps/moneybird | sales-invoice-list | new-sales-invoice, new-or-updated-sales-invoice | apps/moneybird/README.md Triggers section (verified 2026-11-10) | hand | sales-invoice-list passes the documented created_after/updated_after filters (exclusive, UTC) with a 10-minute overlap and id dedupe (https://developer.moneybird.com/api/sales_invoices); contact-list has no filter param so contacts stay webhook-only |
| apps/mongodb-atlas | event-list | new-event | apps/mongodb-atlas/README.md Triggers section (verified 2026-11-09) | hand | event-list minDate set to cursor minus 2 min overlap, deduped by event id (shape b); no sort order is documented. |
| apps/moonclerk | customer-list | new-customer | apps/moonclerk/README.md Triggers section (verified 2026-11-09) | hand | Customer list has a bounded 100-row page and documented checkout_from creation-date filter; the trigger uses overlap plus ID deduplication |
| apps/mural | mural-list | new-mural, new-or-updated-mural | apps/mural/README.md Triggers section (verified 2026-11-09) | hand | new-mural wraps mural-list sortBy=lastCreated; new-or-updated-mural sortBy=lastModified with idOf id:updatedOn (developers.mural.co getworkspacemurals documents both sorts and updatedOn) |
| apps/nationbuilder | person-list | new-person, new-or-updated-person | apps/nationbuilder/README.md Triggers section (verified 2026-11-09) | hand | wraps person-list with sort=-created_at / -updated_at; the v2 spec documents JSON:API sort but not a default order, so the sort is explicit |
| apps/ninox | record-list | new-or-updated-record | apps/ninox/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action record-list |
| apps/nocodb | record-list | new-record | apps/nocodb/README.md Triggers section (verified 2026-11-09) | hand | wraps record-list with sort=-Id (auto-increment primary key; sort documented as column name, - for descending) on a user-chosen table |
| apps/nocrm | lead-get-many | new-lead | apps/nocrm/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action lead-get-many |
| apps/notion | get-many-database-pages | new-database-page | apps/notion/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action get-many-database-pages |
| apps/nutshell | find-leads | new-lead | apps/nutshell/README.md Triggers section (verified 2026-11-10) | hand | Find Leads takes documented $orderBy/$orderDirection/$limit (https://developers-rpc.nutshell.com/detail/class_core.html); trigger reads one id-descending page of 100 with stable lead IDs |
| apps/odoo | list-contacts | new-contact, new-or-updated-contact | apps/odoo/README.md Triggers section (verified 2026-11-09) | hand | wraps list-contacts with order=create_date desc / write_date desc (ORM log-access fields) |
| apps/okta | user-list | new-user, new-or-updated-user | apps/okta/README.md Triggers section (verified 2026-11-10) | hand | user-list passes SCIM search over documented top-level created/lastUpdated (Okta Management OpenAPI listUsers); search is eventually consistent so a 30-minute overlap plus id dedupe is used; group-list exposes only q so groups stay event-hook-only |
| apps/omnisend | list-contacts | new-contact | apps/omnisend/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-contacts |
| apps/oncehub | sms-notification-list | new-sms-notification | apps/oncehub/README.md Triggers section (verified 2026-11-09) | hand | OnceHub pagination guide: list requests return objects in reverse chronological order |
| apps/onepagecrm | list-contacts | new-contact | apps/onepagecrm/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-contacts |
| apps/onesignal | view-messages | new-message | apps/onesignal/README.md Triggers section (verified 2026-11-10) | hand | view-messages (GET /notifications) is documented 'sorted by queued_at in descending order' (https://documentation.onesignal.com/reference/view-messages); webhook upgrade (delivery/click events) stays queued |
| apps/ontraport | contact-list | new-contact, new-or-updated-contact, new-purchase, new-or-updated-order | apps/ontraport/README.md Triggers section (verified 2026-11-09) | hand | contact-list sorts by date (Date Added) / dlm (Date Modified) with sortDir=desc (api.ontraport.com/doc/); purchase-list sorts by date, order-list by dlm; task-list not wrapped (sort on date_assigned not documented as accepted); Subscribe-to-a-webhook API recorded in webhooks file. |
| apps/openai | files-list | new-file, new-model | apps/openai/README.md Triggers section (verified 2026-11-09) | hand | files-list gained additive limit/order inputs; /files documents order=created_at default desc (listFiles in openai-openapi); list-models snapshot (one unpaginated request) emits added models only. |
| apps/otter | conversation-list | new-conversation | apps/otter/README.md Triggers section (verified 2026-11-09) | hand | conversation-list is documented most recent first (limit 1-20 per the same article); stable conversation ids; request uses limit=20. |
| apps/outreach | account-list | new-account, new-or-updated-account | apps/outreach/README.md Triggers section (verified 2026-11-09) | hand | wraps account-list with sort=-createdAt / -updatedAt (sort syntax documented; per-attribute sortability not spelled out) |
| apps/outseta | list-accounts | new-account, new-person, new-deal, new-case, new-invoice | apps/outseta/README.md Triggers section (verified 2026-11-09) | hand | list endpoints take orderBy=PropertyName+DESC and Created__gt (docs.outseta.com/api-reference/overview); triggers sort by Created DESC on accounts, people, deals, cases and invoices; Activity Notifications webhooks recorded in webhooks file. |
| apps/paddle | customer-list | new-customer | apps/paddle/README.md Triggers section (verified 2026-11-09) | hand | order_by documents only id, default id[DESC] |
| apps/pagerduty | incident-list | new-incident | apps/pagerduty/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action incident-list |
| apps/pandadoc | document-get-many | new-document, new-or-updated-document | apps/pandadoc/README.md Triggers section (verified 2026-11-09) | hand | order_by documents -date_created / -date_modified |
| apps/paperform | list-form-submissions | new-submission, new-form | apps/paperform/README.md Triggers section (verified 2026-11-09) | hand | list-form-submissions and list-forms are documented sorted by created_at, default DESC; form webhook recorded in webhooks file. |
| apps/pardot | landing-page-list | new-landing-page, new-or-updated-landing-page | apps/pardot/README.md Triggers section (verified 2026-11-09) | hand | new-landing-page orderBy=id DESC; new-or-updated-landing-page since-filter updatedAtAfter (landing-page-list param) with idOf id:updatedAt |
| apps/parseur | document-list | new-document | apps/parseur/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action document-list |
| apps/particle | device-list | new-device | apps/particle/README.md Triggers section (verified 2026-11-09) | hand | snapshot diff over GET /v1/devices (unpaged account list sorted by last_handshake_at, not claim time) |
| apps/paystack | transaction-list | new-transaction, new-customer, new-refund | apps/paystack/README.md Triggers section (verified 2026-11-09) | hand | transaction-list, customer-list and refund-list take documented from/to date filters (since-filter shape, dedupe by id); charge.success webhook upgrade queued. |
| apps/pdfmonkey | list-documents | new-document, new-or-updated-document | apps/pdfmonkey/README.md Triggers section (verified 2026-11-09) | hand | since-filter: q[updated_since]=cursor-120s with id dedupe (no documented sort order); new-document ignores cards whose created_at is older than the since window; page-2 loss mode disclosed in README |
| apps/pendo | list-guides | new-guide | apps/pendo/README.md Triggers section (verified 2026-11-09) | hand | GET /api/v1/guide returns the whole hand-authored guide list in one response (snapshot, additions only); list-features/list-pages not wrapped (auto-discovered, no documented cap, can pass the 5000-row snapshot limit); no webhook offering found on developers.pendo.io. |
| apps/pennylane | list-customer-invoices | new-customer-invoice | apps/pennylane/README.md Triggers section (verified 2026-11-09) | hand | sort documented, default -id; trigger sorts -id explicitly |
| apps/perplexity | list-models | new-model | apps/perplexity/README.md Triggers section (verified 2026-11-09) | hand | Snapshots the short vendor-wide Agent API model catalog (GET /v1/models, one request) and emits additions only; web-search is an ad-hoc ranked search, not a record feed (https://docs.perplexity.ai/api-reference/models-get) |
| apps/personio | list-employees | new-employee, new-or-updated-employee | apps/personio/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: list-employees updatedSince = cursor-10min, id dedupe; new-employee keeps created_at in window (https://github.com/personio/api-docs/blob/HEAD/personio-personnel-data-api-oa3.yaml) |
| apps/perspective | contact-list | new-contact | apps/perspective/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/phantombuster | agent-list | new-agent | apps/phantombuster/README.md Triggers section (verified 2026-11-09) | hand | agents/fetch-all returns all agents in one response (snapshot, additions only); container-list only has beforeEndedAt so no run feed; per-agent end-of-run webhook recorded in webhooks file. |
| apps/phrase | job-list | new-job, new-or-updated-job | apps/phrase/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll with a declared projectId param: job-list updatedSince = cursor-10min, id dedupe (https://developers.phrase.com/en/api/strings/jobs/list-jobs) |
| apps/pinecone | index-list | new-index, new-backup | apps/pinecone/README.md Triggers section (verified 2026-11-09) | hand | Bounded snapshots (<=200 indexes, <=1000 backups per project per https://docs.pinecone.io/reference/api/database-limits/object-limits), additions only; namespace-list unbounded, model-list is a vendor catalog, record-list is lexicographic id enumeration |
| apps/pipefy | pipe-list | new-pipe | apps/pipefy/README.md Triggers section (verified 2026-11-09) | hand | pipe-list reads one organization's pipes in a single GraphQL query (snapshot, additions only); card-list filters by title only so cards stay a webhook candidate (recorded in webhooks file); organization-list/table-list not wrapped. |
| apps/placid | template-list | new-template, new-or-updated-template | apps/placid/README.md Triggers section (verified 2026-11-09) | hand | Polls created and updated template sort orders. |
| apps/planningcenter | list-event-instances | new-event-instance, new-or-updated-event-instance | apps/planningcenter/README.md Triggers section (verified 2026-11-09) | hand | list-event-instances order=-created_at / -updated_at (orderable per https://api.planningcenteronline.com/calendar/v2/documentation/2022-07-07/vertices/event_instance) |
| apps/plivo | list-messages | new-message, new-call | apps/plivo/README.md Triggers section (verified 2026-11-09) | hand | list-messages (message_time__gt) and list-calls (end_time__gte) take documented time filters (since-filter shape, dedupe by uuid); signed message/call callbacks recorded in webhooks file. |
| apps/podio | task-list | new-task | apps/podio/README.md Triggers section (verified 2026-11-09) | hand | Polls tasks sorted by created_on descending. |
| apps/podium | conversation-list | new-conversation | apps/podium/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action conversation-list |
| apps/postgres | query | new-row | no | hand | shipped poll trigger(s) over list action query |
| apps/postmark | list-outbound-messages | new-outbound-message | apps/postmark/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-outbound-messages |
| apps/printavo | task-list | new-task | apps/printavo/README.md Triggers section (verified 2026-11-09) | hand | Polls tasks sorted by CREATED_AT descending. |
| apps/processstreet | workflow-run-list | new-workflow-run | apps/processstreet/README.md Triggers section (verified 2026-11-09) | hand | Polls the documented newest-created workflow run list. |
| apps/productboard | note-list | new-note, new-or-updated-note | apps/productboard/README.md Triggers section (verified 2026-11-09) | hand | Since-filter poll: note-list createdFrom / updatedFrom = cursor-10min, id dedupe (https://developer.productboard.com/reference/listnotes) |
| apps/productive | deal-list | new-deal-list | no | scan | list action deal-list has pagination and order/since params |
| apps/pushbullet | chat-list | new-chat-list | no | scan | list action chat-list has pagination and order/since params |
| apps/pushover | sounds-list | new-sounds-list | no | scan | list action sounds-list has pagination and order/since params |
| apps/quickbase | list-tables | new-tables | no | scan | list action list-tables has pagination and order/since params |
| apps/quickbooks | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/raindrop | collection-list | new-collection-list | no | scan | list action collection-list has pagination and order/since params |
| apps/raisely | campaign-list | new-campaign-list | no | scan | list action campaign-list has pagination and order/since params |
| apps/razorpay | order-list | new-order-list | no | scan | list action order-list has pagination and order/since params |
| apps/rdstation | list-contacts | new-contact | apps/rdstation/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-contacts |
| apps/readwise | book-list | new-book-list | no | scan | list action book-list has pagination and order/since params |
| apps/recharge | order-list | new-order-list | no | scan | list action order-list has pagination and order/since params |
| apps/recruit-crm | job-list | new-job-list | no | scan | list action job-list has pagination and order/since params |
| apps/recruitee | task-list | new-task-list | no | scan | list action task-list has pagination and order/since params |
| apps/recurly | list-invoices | new-invoices | no | scan | list action list-invoices has pagination and order/since params |
| apps/reddit | post-list | new-post | apps/reddit/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action post-list |
| apps/refiner | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/regfox | form-list | new-form-list | no | scan | list action form-list has pagination and order/since params |
| apps/relevanceai | agent-list | new-agent-list | no | scan | list action agent-list has pagination and order/since params |
| apps/replicate | prediction-list | new-prediction-list | no | scan | list action prediction-list has pagination and order/since params |
| apps/replyio | sequence-contact-list | new-sequence-contact-list | no | scan | list action sequence-contact-list has pagination and order/since params |
| apps/retellai | list-agents | new-agents | no | scan | list action list-agents has pagination and order/since params |
| apps/ringover | call-list | new-call | apps/ringover/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action call-list |
| apps/rippling | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/rocketchat | list-users | new-users | no | scan | list action list-users has pagination and order/since params |
| apps/rootly | incident-list | new-incident | apps/rootly/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action incident-list |
| apps/salesforce | query | new-record | apps/salesforce/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action query |
| apps/salesloft | person-list | new-person | apps/salesloft/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action person-list |
| apps/salesmsg | contact-list | new-contact | apps/salesmsg/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/salla | order-history-list | new-order-history-list | no | scan | list action order-history-list has pagination and order/since params |
| apps/samcart | funnel-order-list | new-funnel-order-list | no | scan | list action funnel-order-list has pagination and order/since params |
| apps/scoreapp | result-list | new-result-list | no | scan | list action result-list has pagination and order/since params |
| apps/seamlessai | task-list | new-task | apps/seamlessai/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action task-list |
| apps/seatable | row-list | new-row | apps/seatable/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action row-list |
| apps/sendblue | message-list | new-message | apps/sendblue/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action message-list |
| apps/sender | field-list | new-field-list | no | scan | list action field-list has pagination and order/since params |
| apps/sendfox | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/sendpulse | deals-list | new-deals-list | no | scan | list action deals-list has pagination and order/since params |
| apps/sentry | issue-list | new-issue-list | no | scan | list action issue-list has pagination and order/since params |
| apps/servicem8 | category-list | new-category-list | no | scan | list action category-list has pagination and order/since params |
| apps/seven | contact-list | new-contact | apps/seven/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/sharetribe | event-list | new-event-list | no | scan | list action event-list has pagination and order/since params |
| apps/shipstation | shipment-list | new-shipment-list | no | scan | list action shipment-list has pagination and order/since params |
| apps/short-io | link-list | new-link-list | no | scan | list action link-list has pagination and order/since params |
| apps/simplero | purchase-list | new-purchase-list | no | scan | list action purchase-list has pagination and order/since params |
| apps/simpletexting | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/slite | km-note-list | new-km-note-list | no | scan | list action km-note-list has pagination and order/since params |
| apps/smartsheet | list-container-children | new-container-children | no | scan | list action list-container-children has pagination and order/since params |
| apps/smartsuite | list-records | new-records | no | scan | list action list-records has pagination and order/since params |
| apps/snyk | issue-list | new-issue-list | no | scan | list action issue-list has pagination and order/since params |
| apps/softr | record-list | new-record-list | no | scan | list action record-list has pagination and order/since params |
| apps/splitwise | list-expenses | new-expenses | no | scan | list action list-expenses has pagination and order/since params |
| apps/spotify | search | new-record | no | scan | list action search has pagination and order/since params |
| apps/square | customer-get-many | new-customer | apps/square/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-get-many |
| apps/squarespace-commerce | list-orders | new-orders | no | scan | list action list-orders has pagination and order/since params |
| apps/stackexchange | user-answer-list | new-user-answer-list | no | scan | list action user-answer-list has pagination and order/since params |
| apps/statuspage | component-list | new-component-list | no | scan | list action component-list has pagination and order/since params |
| apps/storyblok | story-list | new-story | apps/storyblok/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action story-list |
| apps/strapi | entry-list | new-entry | apps/strapi/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action entry-list |
| apps/streak | box-list | new-box-list | no | scan | list action box-list has pagination and order/since params |
| apps/streamtime | search-records | new-records | no | scan | list action search-records has pagination and order/since params |
| apps/supabase | rows-list | new-rows-list | no | scan | list action rows-list has pagination and order/since params |
| apps/supadata | youtube-search | new-youtube-search | no | scan | list action youtube-search has pagination and order/since params |
| apps/superchat | conversation-messages-list | new-conversation-messages-list | no | scan | list action conversation-messages-list has pagination and order/since params |
| apps/synthflow | call-list | new-call-list | no | scan | list action call-list has pagination and order/since params |
| apps/systemeio | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/tableau | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/tailscale | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/tally | submission-get-many | new-submission-get-many | no | scan | list action submission-get-many has pagination and order/since params |
| apps/taskade | my-project-list | new-my-project-list | no | scan | list action my-project-list has pagination and order/since params |
| apps/teachable | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/teamleader | contacts-list | new-contacts-list | no | scan | list action contacts-list has pagination and order/since params |
| apps/teamup | customer-memberships-list | new-customer-memberships-list | no | scan | list action customer-memberships-list has pagination and order/since params |
| apps/teamwork | project-list | new-project-list | no | scan | list action project-list has pagination and order/since params |
| apps/textmagic | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/thanksio | order-items-list | new-order-items-list | no | scan | list action order-items-list has pagination and order/since params |
| apps/tickettailor | issued-ticket-list | new-issued-ticket-list | no | scan | list action issued-ticket-list has pagination and order/since params |
| apps/ticktick | list-habits | new-habits | no | scan | list action list-habits has pagination and order/since params |
| apps/tidio | lyro-data-source-list | new-lyro-data-source-list | no | scan | list action lyro-data-source-list has pagination and order/since params |
| apps/timelinesai | messages-list | new-messages-list | no | scan | list action messages-list has pagination and order/since params |
| apps/tremendous | order-list | new-order-list | no | scan | list action order-list has pagination and order/since params |
| apps/trustpilot | business-unit-reviews-list | new-business-unit-reviews-list | no | scan | list action business-unit-reviews-list has pagination and order/since params |
| apps/tumblr | blog-posts-list | new-post | apps/tumblr/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action blog-posts-list |
| apps/twist | message-list | new-message-list | no | scan | list action message-list has pagination and order/since params |
| apps/twitch | search-categories | new-categories | no | scan | list action search-categories has pagination and order/since params |
| apps/twitter | tweet-search-recent | new-tweet | apps/twitter/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action tweet-search-recent |
| apps/typefully | draft-list | new-draft | apps/typefully/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action draft-list |
| apps/typesense | document-search | new-document-search | no | scan | list action document-search has pagination and order/since params |
| apps/unbounce | page-lead-list | new-lead | apps/unbounce/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action page-lead-list |
| apps/upsales | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/vanta | issue-list | new-issue | apps/vanta/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action issue-list |
| apps/vapi | phone-number-list | new-phone-number | apps/vapi/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action phone-number-list |
| apps/vercel | deployment-event-list | new-deployment-event-list | no | scan | list action deployment-event-list has pagination and order/since params |
| apps/videoask | conversation-list | new-conversation | apps/videoask/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action conversation-list |
| apps/vimeo | folder-item-list | new-folder-item-list | no | scan | list action folder-item-list has pagination and order/since params |
| apps/wave | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/wealthbox | list-contacts | new-contacts | no | scan | list action list-contacts has pagination and order/since params |
| apps/webinargeek | message-list | new-message | apps/webinargeek/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action message-list |
| apps/webscrapingai | serp-search | new-serp-search | no | scan | list action serp-search has pagination and order/since params |
| apps/whatconverts | leads-list | new-leads-list | no | scan | list action leads-list has pagination and order/since params |
| apps/whop | member-list | new-member-list | no | scan | list action member-list has pagination and order/since params |
| apps/wistia | folder-list | new-folder-list | no | scan | list action folder-list has pagination and order/since params |
| apps/wix | list-contacts | new-contacts | no | scan | list action list-contacts has pagination and order/since params |
| apps/woodpecker | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/wordpress | post-get-all | new-post | apps/wordpress/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action post-get-all |
| apps/workable | candidate-list | new-candidate | apps/workable/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action candidate-list |
| apps/workos | event-list | new-event-list | no | scan | list action event-list has pagination and order/since params |
| apps/wrike | task-list | new-task-list | no | scan | list action task-list has pagination and order/since params |
| apps/wufoo | entry-list | new-entry | apps/wufoo/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action entry-list |
| apps/xai | list-files | new-files | no | scan | list action list-files has pagination and order/since params |
| apps/xero | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/youform | submission-list | new-submission | apps/youform/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action submission-list |
| apps/zendesk/zendesk-sell | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/zoho/bigin | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/zoho/zoho | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/zoho/zoho-campaigns | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/zoho/zoho-cliq | chat-list | new-chat-list | no | scan | list action chat-list has pagination and order/since params |
| apps/zoho/zoho-inventory | salesorder-list | new-salesorder-list | no | scan | list action salesorder-list has pagination and order/since params |
| apps/zoho/zoho-projects | issue-list | new-issue-list | no | scan | list action issue-list has pagination and order/since params |
| apps/zoho/zoho-recruit | candidate-list | new-candidate-list | no | scan | list action candidate-list has pagination and order/since params |
| apps/zoho/zoho-sheet | workbook-list | new-workbook-list | no | scan | list action workbook-list has pagination and order/since params |
| apps/zoho/zoho-sign | request-list | new-request-list | no | scan | list action request-list has pagination and order/since params |
| apps/zoho/zohodesk | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/zoho/zohomail | message-list | new-message-list | no | scan | list action message-list has pagination and order/since params |
| apps/zuora | invoice-list | new-invoice-list | no | scan | list action invoice-list has pagination and order/since params |

## none (186)

| app | candidates | verified | source | reason |
|---|---|---|---|---|
| apps/adalo |  | apps/adalo/README.md Triggers section (verified 2026-11-10) | hand | list-records offers only offset/limit and a single-property equality filter; Adalo's Collections API documents no sort order or created-since filter (https://help.adalo.com/integrations/the-adalo-api/collections) |
| apps/airbyte | new-destination | no | hand | List destinations documents pagination but no creation order, update filter, or bounded collection size (https://reference.airbyte.com/reference/listdestinations) |
| apps/airtop |  | apps/airtop/README.md Triggers section (verified 2026-11-10) | hand | session-list takes only sessionIds, status, offset and limit and file-list only sessionIds, offset and limit; neither documents an order or created-since filter, and sessions are short-lived browser sessions the workflow itself opens (https://docs.airtop.ai/api-reference/airtop-api/sessions/list, https://docs.airtop.ai/api-reference/airtop-api/files/list) |
| apps/brandfetch |  | apps/brandfetch/README.md Triggers section (verified 2026-11-09) | hand | Brand search is a stateless lookup catalog, not an account record collection that can change |
| apps/chatbase |  | apps/chatbase/README.md Triggers section (verified 2026-11-09) | hand | conversation-list is ordered by createdAt with no documented direction and the action exposes no sort or since filter (https://chatbase.co/docs/api-reference/v2/conversations/list-conversations.md) |
| apps/clearbit |  | no | hand | Enrichment/prospector/reveal lookups only, no account records that change; the 202 lookup callback is per-request, not an event subscription, and no fetchable vendor page documents it (dashboard.clearbit.com/docs is a JS app; legacy keys only since HubSpot's acquisition) |
| apps/clockodo |  | apps/clockodo/README.md Triggers section (verified 2026-11-09) | hand | list-entries requires a time_since/time_until window over the entry's own time with no created/updated filter or sort, so back-dated entries never look new (https://www.clockodo.com/en/api/) |
| apps/coda |  | apps/coda/README.md Triggers section (verified 2026-11-09) | hand | list-rows returns rows by creation time ascending unless sorted, with no descending order or created-since filter (https://coda.io/developers/apis/v1#operation/listRows) |
| apps/coingecko |  | apps/coingecko/README.md Triggers section (verified 2026-11-09) | hand | list-coin-markets is a market-cap ranking, not a chronological record feed (https://docs.coingecko.com/reference/coins-markets) |
| apps/creditrepaircloud |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/crunchbase |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/cursor |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/deepgram |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/deepl |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/deepseek |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/demio |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/dice |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/diffbot |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/discord |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/dixa |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/documenso |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/documerge |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/docuseal |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/drata |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/drip |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/dropbox/dropbox |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/dropbox/dropbox-sign |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/dropcontact |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/dust |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/edenai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/elastic-email |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/emailoctopus |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/enrichlayer | company-employees | apps/enrichlayer/README.md Triggers section (verified 2026-11-09) | hand | each poll needs a per-company or per-school URL and spends enrichment credits; no account-wide record feed (https://enrichlayer.com/docs) |
| apps/esignatures |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/everhour |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/exa |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/expensify |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/fareharbor |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/feedly |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/fireberry |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/firecrawl |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/fireflies |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/fivetran |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/flodesk |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/formidableforms |  | apps/formidableforms/README.md Triggers section (verified 2026-11-09) | hand | entries list documents no sort token, created-since semantics or page size (https://formidableforms.com/knowledgebase/formidable-api-rest-endpoints/) |
| apps/fortnox |  | apps/fortnox/README.md Triggers section (verified 2026-11-09) | hand | customer-list orders only by customer number or name and its lastmodified filter cannot separate new from edited customers (https://developer.fortnox.se/documentation/resources/customers/) |
| apps/gcs |  | apps/gcs/README.md Triggers section (verified 2026-11-09) | hand | object listings are lexicographic by object name and object-change notifications publish to Pub/Sub rather than an HTTP event subscription |
| apps/giphy |  | apps/giphy/README.md Triggers section (verified 2026-11-09) | hand | search, trending, random, and translate endpoints return catalog results rather than account records that change |
| apps/google/gemini |  | apps/google/gemini/README.md Triggers section (verified 2026-11-09) | hand | model-list and generation APIs are stateless inference resources, not user records with change events |
| apps/google/google-admin |  | apps/google/google-admin/README.md Triggers section (verified 2026-11-09) | hand | users.list can only be ordered by EMAIL, FAMILY_NAME or GIVEN_NAME and its query has no creation-time filter, so no existing list sees new users (https://developers.google.com/workspace/admin/directory/reference/rest/v1/users/list) |
| apps/google/google-ads |  | apps/google/google-ads/README.md Triggers section (verified 2026-11-09) | hand | customer_client rows carry no creation time and the list is ordered by hierarchy level, so a new sub-account in a large manager cannot be told apart from a bounded page (https://developers.google.com/google-ads/api/reference/rpc/latest/CustomerClient) |
| apps/google/google-analytics |  | apps/google/google-analytics/README.md Triggers section (verified 2026-11-09) | hand | account and property lists are paginated configuration reads with no documented newest-first order or changed-since filter |
| apps/google/google-docs |  | apps/google/google-docs/README.md Triggers section (verified 2026-11-09) | hand | the Docs API exposes get and mutation methods for a known document ID, but no document collection list endpoint |
| apps/google/google-maps |  | apps/google/google-maps/README.md Triggers section (verified 2026-11-09) | hand | geocoding, routing, places, and elevation APIs are stateless request/response services with no user-record collection |
| apps/google/google-slides |  | apps/google/google-slides/README.md Triggers section (verified 2026-11-09) | hand | the Slides API gets or modifies a known presentation ID but has no presentation list endpoint |
| apps/google/google-vertex-ai |  | apps/google/google-vertex-ai/README.md Triggers section (verified 2026-11-09) | hand | batch prediction job listing has no documented newest-first order or created/updated-since filter (https://cloud.google.com/vertex-ai/docs/reference/rest/v1/projects.locations.batchPredictionJobs/list) |
| apps/google/googlesearchconsole |  | apps/google/googlesearchconsole/README.md Triggers section (verified 2026-11-09) | hand | the site list returns every accessible site with no documented bounded collection cap or change filter (https://developers.google.com/webmaster-tools/v1/sites/list); 'new site' rejected: adding a verified site is a rare admin act, not a record stream |
| apps/google/looker |  | apps/google/looker/README.md Triggers section (verified 2026-11-09) | hand | existing dashboard and Look actions read unbounded collections without a newest-first order or since filter (https://cloud.google.com/looker/docs/reference/looker-api/latest); connection and model lists are rarely-changing admin configuration, rejected |
| apps/grist | new-record | apps/grist/README.md Triggers section (verified 2026-11-09) | hand | list-records has no app-independent creation-time sort; each table chooses its own schema. |
| apps/groq |  | apps/groq/README.md Triggers section (verified 2026-11-09) | hand | the existing batch list action exposes no documented newest-first order or created/updated-since filter (https://console.groq.com/docs/batch) |
| apps/hedy |  | apps/hedy/README.md Triggers section (verified 2026-11-09) | hand | session and highlight lists are cursor-paged without a documented newest-first order or created/updated-since filter (https://api.swaggerhub.com/apis/HedyAI/hedy-api/1.0.1) |
| apps/holded |  | apps/holded/README.md Triggers section (verified 2026-11-09) | hand | CRM list endpoints return uncapped full collections with no documented ordering or since filter (https://holded.readme.io/reference); the funnel list is rarely-changing account configuration, rejected as a 'new funnel' event |
| apps/htmlcsstoimage |  | apps/htmlcsstoimage/README.md Triggers section (verified 2026-11-09) | hand | the image list GET /v1/images documents only page_token and count: no stated order and no since-filter, so new images cannot be told from old ones (https://htmlcsstoimage.com/openapi/v1.json) |
| apps/instapaper |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/jenkins |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/jev |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/jinaai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/judgeme |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/klaviyo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/klicktipp |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/klipfolio |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/kvcore | new-user | apps/kvcore/README.md Triggers section (verified 2026-11-09) | hand | user-list takes only an updated-since filter and documents no created-time field or sort, so a new user cannot be told from an edited one (https://developer.insiderealestate.com/publicv2/reference/get_v2-public-users) |
| apps/landbot |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/launchdarkly |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/leadfeeder |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/learnworlds |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/line |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/linkedin/linkedin-conversions |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/linkup |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/litellm |  | no | hand | no actions: a model-provider connection used only by the host's model layer |
| apps/livechat |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/lob |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/lodgify |  | no | hand | list-bookings has no sort order and no created-since filter, only updatedSince with no documented booking stamp to tell new from edited; vendor docs 403 to curl so default order unverifiable (https://docs.lodgify.com/reference/list-bookings) |
| apps/mailcheck |  | no | hand | email-validation API lists batch-operation jobs, not durable created records |
| apps/meta/facebook-conversions |  | no | hand | dataset diagnostics and quality endpoints are analytics/report resources, not durable record lists |
| apps/meta/facebook-custom-audiences |  | no | hand | custom-audience lists are cursor paged without documented newest-first ordering, a since filter, or bounded collection guarantee |
| apps/metabase | new-record | apps/metabase/README.md Triggers section (verified 2026-11-09) | hand | collection-items sorts by last_edited_at but the item payload documents no edit timestamp to key an edit on; other list/search actions have no created-time order or since filter (https://www.metabase.com/docs/latest/api/collection). |
| apps/metricool |  | no | hand | scheduled-post listing requires a caller-supplied date range and lacks a documented newest-first or since-cursor contract |
| apps/microsoft/microsoft-todo | new-task | apps/microsoft/microsoft-todo/README.md Triggers section (verified 2026-11-09) | hand | Graph docs name no sort or created-since parameter list-tasks is documented to honour, and list-task-changes is delta-ordered (https://learn.microsoft.com/en-us/graph/api/todotasklist-list-tasks?view=graph-rest-1.0). |
| apps/mistral |  | apps/mistral/README.md Triggers section (verified 2026-11-09) | hand | stateless AI inference API; its model list is a capability catalog, not a changing user-record feed |
| apps/motion |  | apps/motion/README.md Triggers section (verified 2026-11-09) | hand | task and project actions use opaque cursors with no documented creation-time order or since filter |
| apps/msg91 |  | apps/msg91/README.md Triggers section (verified 2026-11-09) | hand | no fetchable MSG91 webhook documentation found (docs.msg91.com/reference/webhooks 404); existing lists are templates, numbers, analytics and windowed delivery logs, not a stable new-record collection |
| apps/mux | new-asset-list | apps/mux/README.md Triggers section (verified 2026-11-09) | hand | asset-list has no documented sort order or created-since filter (params: limit, page, live_stream_id, upload_id; https://github.com/muxinc/mux-node-sdk/blob/master/src/resources/video/assets.ts) |
| apps/netsuite |  | apps/netsuite/README.md Triggers section (verified 2026-11-09) | hand | generic record listing accepts arbitrary record types and filtering but has no fixed record schema or documented newest-first ordering for a safe poll |
| apps/newrelic |  | apps/newrelic/README.md Triggers section (verified 2026-11-09) | hand | NerdGraph entity and issue searches use cursors but existing actions expose no documented newest-first or since-created query |
| apps/ollama |  | apps/ollama/README.md Triggers section (verified 2026-11-09) | hand | local model listing is server capability state, not a user-record feed with creation ordering |
| apps/ollama-cloud |  | apps/ollama-cloud/README.md Triggers section (verified 2026-11-09) | hand | hosted model listing is a capability catalog, not a changing user-record feed |
| apps/onepassword | new-item-file-list | apps/onepassword/README.md Triggers section (verified 2026-11-09) | hand | no existing list fits: Connect collections have no documented sort or created-since filter; audit-event/signin-attempt are start_time cursor streams with unstated order (https://developer.1password.com/docs/events-api/reference/) |
| apps/onesimpleapi |  | apps/onesimpleapi/README.md Triggers section (verified 2026-11-09) | hand | stateless conversion, generation, lookup, and validation utility API with no account records |
| apps/openrouter |  | apps/openrouter/README.md Triggers section (verified 2026-11-09) | hand | list-models is offset-paged (limit up to 1000) with no total, so one request cannot be shown to hold the whole catalog for a snapshot; the other actions are inference, usage or single-resource lookups with no record feed; no webhook offering found in the API reference. |
| apps/pdfco |  | apps/pdfco/README.md Triggers section (verified 2026-11-09) | hand | stateless conversion/job API: no list action returns account records; the only event offering is a per-request async-job callback URL (recorded in webhooks file), not a subscription. |
| apps/peopledatalabs |  | apps/peopledatalabs/README.md Triggers section (verified 2026-11-09) | hand | search/enrichment endpoints query PDL's external dataset, not an account-owned record feed; PDL webhooks (person data updates) are enterprise-only and registered through PDL staff (recorded in webhooks file). |
| apps/pinterest | new-pin | apps/pinterest/README.md Triggers section (verified 2026-11-09) | hand | pin-list/pin-search (GET /v5/pins) document no sort order and no date filter, and boards/ad accounts are not documented as bounded (https://developers.pinterest.com/docs/api/v5/pins-list/) |
| apps/plaid | new-institution | apps/plaid/README.md Triggers section (verified 2026-11-09) | hand | institution-list (POST /institutions/get) pages the supported-institution catalog at count<=500 with no sort order or created filter: neither newest-first nor a bounded <=5000 snapshot (https://plaid.com/docs/api/institutions/) |
| apps/plaud |  | apps/plaud/README.md Triggers section (verified 2026-11-09) | hand | transcription-get and device-binding-get need a supplied resource id; docs.plaud.ai/llms.txt lists no list endpoint and no webhook offering. |
| apps/postbin |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/posthog |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/practicebetter |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/printful | new-order | apps/printful/README.md Triggers section (verified 2026-11-09) | hand | order-list (GET /orders) takes only status/offset/limit; the v1 reference states no sort order and no created-after filter (https://developers.printful.com/docs/) |
| apps/printnode |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/procore | new-submittal | apps/procore/README.md Triggers section (verified 2026-11-09) | hand | submittal-list needs a per-project id and a descending sort whose syntax is only published in a JS-rendered reference that could not be verified (https://developers.procore.com/reference/rest/submittals) |
| apps/prospeo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/pylon |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/qdrant |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/quaderno |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/qualtrics |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/quickchart |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/quo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/read-ai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/recallai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/recruiterflow |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/redtail-crm |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/rendex |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/resend |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/respondio |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/ringcentral |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/rocketreach |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/runway |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/salesmate |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/sanity |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/savvycal |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/sellsy |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/semrush |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/sendy |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/servicenow |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/servicetitan |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/shippo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/shortcut |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/sierrainteractive |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/signnow |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/signrequest |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/signwell |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/simplybook |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/skyvern |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/snowflake |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/solapi |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/splunk |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/talentlms |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/tapfiliate |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/tavily |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/telnyx |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/terraform |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/thinkific |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/thrivecart |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/tidycal |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/tiktok-lead-generation |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/tldv |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/twilio/segment |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/twilio/sendgrid |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/upstash |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/uptimerobot |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/uscreen |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/vbout |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/vero |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/wakatime |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/wappalyzer |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/wati |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/webinarjam |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/wiza |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/workday |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/workflowy |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/workiz |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/yelp-leads |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/youcanbookme |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zeplin |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zerobounce |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoho/zoho-analytics |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoho/zoho-bookings |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoho/zoho-calendar |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoho/zoho-creator |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoho/zoho-invoice |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoho/zoho-people |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoho/zoho-workdrive |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoho/zohobooks |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zoom |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/zulip |  | no | scan | no newest-first list action found by scan; vendor events not researched |
