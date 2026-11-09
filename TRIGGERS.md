# Trigger coverage

<!-- Generated from TRIGGERS.json. Do not edit by hand: run
     `deno task --cwd _tools triggers --write` -->

Generated from [TRIGGERS.json](TRIGGERS.json) (the source of truth) by
`deno task --cwd _tools triggers --write`; `--check` fails when this file is stale.
Rows with `verified: false` come from a code scan or model knowledge, not vendor docs.
Shipped status is derived from code (`triggers/*.ts`), never stored here.

**Totals:** 683 apps — webhook-api: 42, manual-webhook: 9, poll: 380, none: 252

## webhook-api (42)

| app | candidates | verified | source | reason |
|---|---|---|---|---|
| apps/activecampaign | new-contact | apps/activecampaign/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/acuityscheduling | appointment-canceled, appointment-rescheduled, appointment-scheduled | apps/acuityscheduling/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/affinity | new-list-entry | apps/affinity/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/asana | new-task, task-updated | apps/asana/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/atlassian/bitbucket | issue-created, pull-request-comment, pull-request-created, pull-request-declined, pull-request-merged, pull-request-updated, push | apps/atlassian/bitbucket/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/atlassian/trello | card-created, card-moved, card-updated, comment-added | apps/atlassian/trello/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/box | activity, file-uploaded | apps/box/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/brevo | new-contact | apps/brevo/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/cal | booking-cancelled, booking-created, booking-rescheduled | apps/cal/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/calendly | invitee-canceled, invitee-created | apps/calendly/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/clickup | task-comment-posted, task-created, task-deleted, task-updated | apps/clickup/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/clockify | new-client, new-project, new-task, new-time-entry, timer-started, timer-stopped | apps/clockify/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/copper | new-company, new-lead, new-opportunity, new-person, new-task, updated-opportunity, updated-person | apps/copper/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/eventbrite | activity, attendee-checked-in, attendee-checked-out, attendee-updated, event-created, event-published, event-unpublished, event-updated, order-placed, order-refunded, order-updated, organizer-updated, ticket-class-created, ticket-class-deleted, ticket-class-updated, venue-updated | no | hand | shipped: webhook registered through the vendor API |
| apps/figma | comment-added, file-deleted, file-updated, file-version-created, library-published | apps/figma/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/formstack | new-submission, new-submission-poll | apps/formstack/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/github | issue, issue-comment, pull-request, push, release, workflow-run | apps/github/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/gitlab | comment, issue, merge-request, pipeline, push, release | apps/gitlab/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/gumroad | new-sale, sale-webhook | apps/gumroad/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/helpscout | conversation-status-changed, customer-replied, new-conversation, new-customer | apps/helpscout/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/intercom | conversation-created, contact-created | no | hand | vendor ships a webhook API (model knowledge; not verified against docs) |
| apps/invoiceninja | invoice-webhook, new-invoice | apps/invoiceninja/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/jotform | new-submission, submission-webhook | apps/jotform/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/lemlist | activity-webhook, new-activity | apps/lemlist/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API; also ships a poll trigger |
| apps/linear | comment, cycle, issue, project | apps/linear/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/mailerlite | campaign-sent, new-subscriber, subscriber-unsubscribed, subscriber-updated | apps/mailerlite/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/mailgun | message-delivered, message-opened | no | hand | vendor ships a webhook API (model knowledge; not verified against docs) |
| apps/mautic | contact-deleted, contact-updated, form-submitted, new-contact | apps/mautic/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/onfleet | task-assigned, task-completed, task-created, task-failed, task-started, task-updated | apps/onfleet/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/paypal | event, invoice-paid, order-approved, payment-captured, payment-refunded, payout-item-succeeded | apps/paypal/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/pipedrive | new-deal | apps/pipedrive/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/shopify | customer-created, event, order-cancelled, order-created, order-fulfilled, order-paid, order-updated, product-created, product-updated, refund-created | apps/shopify/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/stripe | charge-refunded, checkout-completed, customer-created, event, invoice-paid, invoice-payment-failed, payment-failed, payment-succeeded, subscription-canceled, subscription-created | apps/stripe/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/surveymonkey | response-completed | apps/surveymonkey/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/telegram | new-message, update | apps/telegram/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/todoist | task-added, task-completed | no | hand | vendor ships a webhook API (model knowledge; not verified against docs) |
| apps/toggl | project-created, time-entry-created, time-entry-updated | apps/toggl/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/typeform | new-response | apps/typeform/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/webex | new-membership, new-message | apps/webex/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/webflow | collection-item-changed, collection-item-created, form-submission, new-order | apps/webflow/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/woocommerce | customer-created, event, order-created, order-deleted, order-updated, product-created, product-updated | apps/woocommerce/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |
| apps/zendesk/zendesk | new-ticket, ticket-comment-added, ticket-status-changed | apps/zendesk/zendesk/README.md Triggers section (verified 2026-11-09) | hand | shipped: webhook registered through the vendor API |

## manual-webhook (9)

| app | candidates | verified | source | reason |
|---|---|---|---|---|
| apps/customerio | customer-unsubscribed, email-clicked, email-opened, reporting-event | apps/customerio/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/meta/facebook | new-comment, page-feed | apps/meta/facebook/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/meta/facebook-lead-ads | new-lead | apps/meta/facebook-lead-ads/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/meta/whatsapp | message-received, message-status | apps/meta/whatsapp/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/netlify | deploy, deploy-failed, deploy-succeeded | https://docs.netlify.com/api/get-started/ (fetched 2026-11-09, T2.08) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/slack | event, new-message | apps/slack/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/strava | activity-created, activity-deleted, activity-updated | apps/strava/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/twilio/twilio | incoming-message, message-status | apps/twilio/twilio/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |
| apps/wise | balance-updated, profile-state-changed, transfer-payout-failed, transfer-state-changed | apps/wise/README.md Triggers section (verified 2026-11-09) | hand | shipped: signed manual-webhook receiver (user registers the callback URL at the vendor) |

## poll (380)

| app | poll action | candidates | verified | source | reason |
|---|---|---|---|---|---|
| apps/acculynx | job-invoices-list | new-job-invoices-list | no | scan | list action job-invoices-list has pagination and order/since params |
| apps/actionnetwork | person-list | new-person-list | no | scan | list action person-list has pagination and order/since params |
| apps/addevent | event-template-list | new-event-template-list | no | scan | list action event-template-list has pagination and order/since params |
| apps/agencyzoom | lead-list | new-lead-list | no | scan | list action lead-list has pagination and order/since params |
| apps/ahrefs | anchor-list | new-anchor-list | no | scan | list action anchor-list has pagination and order/since params |
| apps/aidbase | ticket-list | new-ticket-list | no | scan | list action ticket-list has pagination and order/since params |
| apps/airbyte | destination-list | new-destination-list | no | scan | list action destination-list has pagination and order/since params |
| apps/aircall | call-list | new-call-list | no | scan | list action call-list has pagination and order/since params |
| apps/airtable | search-records | new-record | apps/airtable/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action search-records |
| apps/alegra | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/algolia | search-multi | new-multi | no | scan | list action search-multi has pagination and order/since params |
| apps/anchor | invoice-list | new-invoice-list | no | scan | list action invoice-list has pagination and order/since params |
| apps/apify | actor-list | new-actor | apps/apify/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action actor-list |
| apps/apollo | deal-list | new-deal-list | no | scan | list action deal-list has pagination and order/since params |
| apps/ashby | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/atlassian/confluence | page-child-list | new-page-child-list | no | scan | list action page-child-list has pagination and order/since params |
| apps/atlassian/jira | issue-search | new-issue | apps/atlassian/jira/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action issue-search |
| apps/atlassian/jira-data-center | comment-get-many | new-comment-get-many | no | scan | list action comment-get-many has pagination and order/since params |
| apps/attio | list-record-attribute-values | new-record-attribute-values | no | scan | list action list-record-attribute-values has pagination and order/since params |
| apps/auth0 | log-list | new-log | apps/auth0/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action log-list |
| apps/authorize-net | list-customer-transactions | new-customer-transactions | no | scan | list action list-customer-transactions has pagination and order/since params |
| apps/avoma | call-list | new-call-list | no | scan | list action call-list has pagination and order/since params |
| apps/aweber | broadcast-list | new-broadcast-list | no | scan | list action broadcast-list has pagination and order/since params |
| apps/axonaut | invoice-list | new-invoice-list | no | scan | list action invoice-list has pagination and order/since params |
| apps/balena | device-list | new-device-list | no | scan | list action device-list has pagination and order/since params |
| apps/bamboohr | list-employees | new-employee | apps/bamboohr/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-employees |
| apps/baremetrics | customer-list | new-customer | apps/baremetrics/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-list |
| apps/base44 | list-audit-logs | new-audit-log | apps/base44/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-audit-logs |
| apps/baserow | row-list | new-row | apps/baserow/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action row-list |
| apps/beehiiv | post-list | new-post-list | no | scan | list action post-list has pagination and order/since params |
| apps/beeminder | list-datapoints | new-datapoint | apps/beeminder/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-datapoints |
| apps/bexio | contact-list | new-contact | apps/bexio/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/bigcommerce | order-list | new-order | apps/bigcommerce/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action order-list |
| apps/bitrix24 | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/bluesky | post-search | new-post | apps/bluesky/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action post-search |
| apps/boldsign | document-list | new-document-list | no | scan | list action document-list has pagination and order/since params |
| apps/booqable | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/braintree | transaction-search | new-transaction-search | no | scan | list action transaction-search has pagination and order/since params |
| apps/braze | campaign-list | new-campaign-list | no | scan | list action campaign-list has pagination and order/since params |
| apps/breezyhr | candidate-search | new-candidate | apps/breezyhr/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action candidate-search |
| apps/browseai | task-list | new-task-list | no | scan | list action task-list has pagination and order/since params |
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
| apps/circle | event-list | new-event | apps/circle/README.md Triggers section (verified 2026-11-09) | hand | Admin API v2 documents default order newest by created_at; records array |
| apps/clerk | user-list | new-user, new-or-updated-user | apps/clerk/README.md Triggers section (verified 2026-11-09) | hand | order_by=-created_at / -updated_at via new optional orderBy input |
| apps/cleverreach | group-list | new-group | apps/cleverreach/README.md Triggers section (verified 2026-11-09) | hand | order=created DESC; changed-field name not verified so no updated trigger |
| apps/clickhouse | activity-list | new-activity | apps/clickhouse/README.md Triggers section (verified 2026-11-09) | hand | from_date filter, unpaged, id dedupe with cursor window |
| apps/clicksend | sms-history-list | new-sms | apps/clicksend/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action sms-history-list |
| apps/clio | contact-list | new-contact, new-or-updated-contact | apps/clio/README.md Triggers section (verified 2026-11-09) | hand | created_since / updated_since filters, id(asc) order: cursor window + id dedupe |
| apps/close | list-opportunities | new-opportunity | apps/close/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-opportunities |
| apps/cloudbeds | guest-list | new-guest-list | no | scan | list action guest-list has pagination and order/since params |
| apps/cloudinary | asset-search | new-asset | apps/cloudinary/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action asset-search |
| apps/coda | list-rows | new-rows | no | scan | list action list-rows has pagination and order/since params |
| apps/coingecko | list-coin-markets | new-coin-markets | no | scan | list action list-coin-markets has pagination and order/since params |
| apps/companycam | checklist-list | new-checklist-list | no | scan | list action checklist-list has pagination and order/since params |
| apps/connecteam | shift-list | new-shift | apps/connecteam/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action shift-list |
| apps/constantcontact | list-contact-lists | new-contact-lists | no | scan | list action list-contact-lists has pagination and order/since params |
| apps/contentful | list-entries | new-entry | apps/contentful/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-entries |
| apps/contentstack | list-assets | new-assets | no | scan | list action list-assets has pagination and order/since params |
| apps/crisp | list-conversations | new-conversations | no | scan | list action list-conversations has pagination and order/since params |
| apps/databricks | catalog-list | job-run-finished | no | survey | AT RISK: no runs action; 8 actions are catalog/sql only. Needs a new action first or blocker. |
| apps/datadog | log-search | new-log | apps/datadog/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action log-search |
| apps/dbtcloud | run-list | new-run | apps/dbtcloud/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action run-list |
| apps/deel | contract-list | new-contract-list | no | scan | list action contract-list has pagination and order/since params |
| apps/deputy | employee-search | new-employee-search | no | scan | list action employee-search has pagination and order/since params |
| apps/devin | session-message-list | new-session-message-list | no | scan | list action session-message-list has pagination and order/since params |
| apps/dialpad | call-list | new-call-list | no | scan | list action call-list has pagination and order/since params |
| apps/digistore24 | list-purchases | new-purchase | apps/digistore24/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-purchases |
| apps/digitalocean | domain-record-list | new-domain-record-list | no | scan | list action domain-record-list has pagination and order/since params |
| apps/discourse | topic-list-latest | new-topic | apps/discourse/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action topic-list-latest |
| apps/docparser | results-list | new-result | apps/docparser/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action results-list |
| apps/document360 | drive-search | new-drive-search | no | scan | list action drive-search has pagination and order/since params |
| apps/docusign | envelope-list | new-envelope-list | no | scan | list action envelope-list has pagination and order/since params |
| apps/donorbox | event-list | new-event-list | no | scan | list action event-list has pagination and order/since params |
| apps/dub | customer-list | new-customer | apps/dub/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-list |
| apps/duda | list-sites | new-site | apps/duda/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-sites |
| apps/easypost | event-list | new-event-list | no | scan | list action event-list has pagination and order/since params |
| apps/ebay | item-search | new-listing | apps/ebay/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action item-search |
| apps/economic | entry-list | new-entry-list | no | scan | list action entry-list has pagination and order/since params |
| apps/ecwid | customer-search | new-customer | apps/ecwid/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action customer-search |
| apps/egnyte | link-list | new-link-list | no | scan | list action link-list has pagination and order/since params |
| apps/elastic | search | new-record | no | scan | list action search has pagination and order/since params |
| apps/elevenlabs | voice-list | new-voice | apps/elevenlabs/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action voice-list |
| apps/encharge | segment-people-list | new-segment-people-list | no | scan | list action segment-people-list has pagination and order/since params |
| apps/enrichlayer | company-employees-list | new-company-employees-list | no | scan | list action company-employees-list has pagination and order/since params |
| apps/erpnext | list-documents | new-documents | no | scan | list action list-documents has pagination and order/since params |
| apps/eztexting | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/fathom | meeting-get-many | new-meeting-get-many | no | scan | list action meeting-get-many has pagination and order/since params |
| apps/fellow | action-item-list | new-action-item | apps/fellow/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action action-item-list |
| apps/fillout | submission-list | new-submission-list | no | scan | list action submission-list has pagination and order/since params |
| apps/findymail | intellimatch-search | new-intellimatch-search | no | scan | list action intellimatch-search has pagination and order/since params |
| apps/firestore | document-list | new-document-list | no | scan | list action document-list has pagination and order/since params |
| apps/float | allocation-list | new-allocation-list | no | scan | list action allocation-list has pagination and order/since params |
| apps/followupboss | list-users | new-users | no | scan | list action list-users has pagination and order/since params |
| apps/formidableforms | entry-get-many | new-entry-get-many | no | scan | list action entry-get-many has pagination and order/since params |
| apps/formsite | result-list | new-result-list | no | scan | list action result-list has pagination and order/since params |
| apps/fortnox | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/freeagent | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/freshworks/freshdesk | ticket-get-many | new-ticket-get-many | no | scan | list action ticket-get-many has pagination and order/since params |
| apps/freshworks/freshsales | contact-get-many | new-contact-get-many | no | scan | list action contact-get-many has pagination and order/since params |
| apps/freshworks/freshservice | ticket-get-many | new-ticket-get-many | no | scan | list action ticket-get-many has pagination and order/since params |
| apps/front | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/gamma | list-gamma-comments | new-gamma-comments | no | scan | list action list-gamma-comments has pagination and order/since params |
| apps/gerrit | change-search | new-change-search | no | scan | list action change-search has pagination and order/since params |
| apps/getresponse | contact-list | new-contact | apps/getresponse/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/ghost | list-posts | new-post | no | hand | shipped poll trigger(s) over list action list-posts |
| apps/gitea | pull-request-list | new-pull-request-list | no | scan | list action pull-request-list has pagination and order/since params |
| apps/givebutter | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/gladia | transcription-list | new-transcription-list | no | scan | list action transcription-list has pagination and order/since params |
| apps/gocardless | list-customers | new-customers | no | scan | list action list-customers has pagination and order/since params |
| apps/google/bigquery | job-list | new-job-list | no | scan | list action job-list has pagination and order/since params |
| apps/google/gmail | get-many-messages | new-email | apps/google/gmail/README.md Triggers section (verified 2026-11-09) | hand | gmail users.messages.list with q=after:<epoch>; H-1 |
| apps/google/google-admin | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/google/google-ads | list-customer-clients | new-customer-clients | no | scan | list action list-customer-clients has pagination and order/since params |
| apps/google/google-business-profile | list-questions | new-question | apps/google/google-business-profile/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-questions |
| apps/google/google-calendar | list-events | event-changed | apps/google/google-calendar/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-events |
| apps/google/google-contacts | list-contact-groups | new-contact-groups | no | scan | list action list-contact-groups has pagination and order/since params |
| apps/google/google-drive | file-list | new-file | apps/google/google-drive/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action file-list |
| apps/google/google-forms | list-forms | new-forms | no | scan | list action list-forms has pagination and order/since params |
| apps/google/google-sheets | sheet-read | row-added, row-added-or-updated, row-updated | apps/google/google-sheets/README.md Triggers section (verified 2026-11-09) | hand | poll sheet-read, diff rows against seeded snapshot |
| apps/google/googlechat | list-messages | new-messages | no | scan | list action list-messages has pagination and order/since params |
| apps/google/youtube | list-comment-threads | new-comment-threads | no | scan | list action list-comment-threads has pagination and order/since params |
| apps/gorgias | customer-get-many | new-customer-get-many | no | scan | list action customer-get-many has pagination and order/since params |
| apps/gotify | message-list | new-message-list | no | scan | list action message-list has pagination and order/since params |
| apps/grain | recording-list | new-recording-list | no | scan | list action recording-list has pagination and order/since params |
| apps/granola | audit-event-list | new-audit-event-list | no | scan | list action audit-event-list has pagination and order/since params |
| apps/gravityforms | entry-get-many | new-entry-get-many | no | scan | list action entry-get-many has pagination and order/since params |
| apps/greenhouse | list-interviews | new-interviews | no | scan | list action list-interviews has pagination and order/since params |
| apps/grist | list-records | new-records | no | scan | list action list-records has pagination and order/since params |
| apps/guru | card-search | new-card | apps/guru/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action card-search |
| apps/gusto | event-list | new-event-list | no | scan | list action event-list has pagination and order/since params |
| apps/harvest | task-get-many | new-task-get-many | no | scan | list action task-get-many has pagination and order/since params |
| apps/hex | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/heyreach | list-get-leads | new-get-leads | no | scan | list action list-get-leads has pagination and order/since params |
| apps/honeybook | project-list | new-project | no | hand | shipped poll trigger(s) over list action project-list |
| apps/hospitable | reservation-list | new-reservation-list | no | scan | list action reservation-list has pagination and order/since params |
| apps/hostaway | list-reservations | new-reservation | no | hand | shipped poll trigger(s) over list action list-reservations |
| apps/hotmart | product-list | new-product-list | no | scan | list action product-list has pagination and order/since params |
| apps/housecallpro | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/hubspot | search-contacts | new-contact | apps/hubspot/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action search-contacts |
| apps/hubstaff | project-list | new-project-list | no | scan | list action project-list has pagination and order/since params |
| apps/huggingface | inference-model-list | new-inference-model-list | no | scan | list action inference-model-list has pagination and order/since params |
| apps/hunter | lead-list | new-lead-list | no | scan | list action lead-list has pagination and order/since params |
| apps/iclosed | deal-list | new-deal | no | hand | shipped poll trigger(s) over list action deal-list |
| apps/inoreader | stream-preferences-list | new-stream-preferences-list | no | scan | list action stream-preferences-list has pagination and order/since params |
| apps/instantly | email-list | new-email | apps/instantly/README.md Triggers section (verified 2026-08-29) | hand | shipped poll trigger(s) over list action email-list |
| apps/ironclad | record-list | new-record-list | no | scan | list action record-list has pagination and order/since params |
| apps/iterable | list-campaigns | new-campaign | apps/iterable/README.md Triggers section (verified 2026-10-06) | hand | shipped poll trigger(s) over list action list-campaigns |
| apps/jibble | activity-list | new-activity-list | no | scan | list action activity-list has pagination and order/since params |
| apps/jobber | invoice-list | new-invoice-list | no | scan | list action invoice-list has pagination and order/since params |
| apps/jobnimbus | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/jobtread | list-jobs | new-job | no | hand | shipped poll trigger(s) over list action list-jobs |
| apps/jumpcloud | user-group-list | new-user-group-list | no | scan | list action user-group-list has pagination and order/since params |
| apps/justcall | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/kajabi | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/keap | contact-list | new-contact | apps/keap/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/kintone | comments-list | new-comment | apps/kintone/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action comments-list |
| apps/kit | list-subscribers | new-subscriber | apps/kit/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-subscribers |
| apps/knack | record-list | new-record-list | no | scan | list action record-list has pagination and order/since params |
| apps/kommo | lead-list | new-lead | apps/kommo/README.md Triggers section (verified 2026-09-05) | hand | shipped poll trigger(s) over list action lead-list |
| apps/kudosity | sms-list | new-sms | no | hand | shipped poll trigger(s) over list action sms-list |
| apps/kustomer | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/kvcore | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/lawmatics | list-contacts | new-contacts | no | scan | list action list-contacts has pagination and order/since params |
| apps/leexi | meeting-event-list | new-meeting-event | no | hand | shipped poll trigger(s) over list action meeting-event-list |
| apps/lemonsqueezy | order-list | new-order-list | no | scan | list action order-list has pagination and order/since params |
| apps/lever | posting-list | new-posting-list | no | scan | list action posting-list has pagination and order/since params |
| apps/lexware-office | voucher-list | new-voucher-list | no | scan | list action voucher-list has pagination and order/since params |
| apps/linkedin/linkedin | list-posts-by-author | new-posts-by-author | no | scan | list action list-posts-by-author has pagination and order/since params |
| apps/linkedin/linkedin-ads | ad-account-list | new-ad-account-list | no | scan | list action ad-account-list has pagination and order/since params |
| apps/linkupapi | job-candidates-list | new-candidate | no | hand | shipped poll trigger(s) over list action job-candidates-list |
| apps/littlegreenlight | constituent-search | new-constituent-search | no | scan | list action constituent-search has pagination and order/since params |
| apps/livestorm | event-list | new-event-list | no | scan | list action event-list has pagination and order/since params |
| apps/lodgify | list-bookings | new-bookings | no | scan | list action list-bookings has pagination and order/since params |
| apps/lofty | lead-activity-list | new-lead-activity-list | no | scan | list action lead-activity-list has pagination and order/since params |
| apps/loop-returns | order-list | new-order | no | hand | shipped poll trigger(s) over list action order-list |
| apps/loops | transactional-list | new-transactional-list | no | scan | list action transactional-list has pagination and order/since params |
| apps/loyverse | receipt-list | new-receipt-list | no | scan | list action receipt-list has pagination and order/since params |
| apps/luma | calendar-events-list | new-calendar-events-list | no | scan | list action calendar-events-list has pagination and order/since params |
| apps/mailchimp/mailchimp | list-members | new-member | apps/mailchimp/mailchimp/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-members |
| apps/maileroo | list-domains | new-domain | no | hand | shipped poll trigger(s) over list action list-domains |
| apps/mailersend | list-sender-identities | new-sender-identities | no | scan | list action list-sender-identities has pagination and order/since params |
| apps/mailjet | list-messages | new-message | apps/mailjet/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-messages |
| apps/maintainx | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/manus | task-list | new-task-list | no | scan | list action task-list has pagination and order/since params |
| apps/manychat | list-flows | new-flows | no | scan | list action list-flows has pagination and order/since params |
| apps/mattermost | post-search | new-post-search | no | scan | list action post-search has pagination and order/since params |
| apps/meilisearch | document-list | new-document-list | no | scan | list action document-list has pagination and order/since params |
| apps/meistertask | checklist-item-list | new-checklist-item-list | no | scan | list action checklist-item-list has pagination and order/since params |
| apps/mem | task-list | new-task-list | no | scan | list action task-list has pagination and order/since params |
| apps/memberstack | member-list | new-member | no | hand | shipped poll trigger(s) over list action member-list |
| apps/mercury | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/meta/instagram-for-business | list-media | new-media | no | scan | list action list-media has pagination and order/since params |
| apps/metabase | search | new-record | no | scan | list action search has pagination and order/since params |
| apps/microsoft/excel | list-workbooks | new-workbooks | no | scan | list action list-workbooks has pagination and order/since params |
| apps/microsoft/microsoft-entra-id | list-deleted-items | new-deleted-items | no | scan | list action list-deleted-items has pagination and order/since params |
| apps/microsoft/microsoft-todo | list-task-changes | new-task-changes | no | scan | list action list-task-changes has pagination and order/since params |
| apps/microsoft/onedrive | list-changes | file-changed | no | hand | shipped poll trigger(s) over list action list-changes |
| apps/microsoft/onenote | list-notebooks | new-notebooks | no | scan | list action list-notebooks has pagination and order/since params |
| apps/microsoft/outlook | list-messages | new-email | apps/microsoft/outlook/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-messages |
| apps/microsoft/sharepoint | list-items | new-list-item | no | hand | shipped poll trigger(s) over list action list-items |
| apps/microsoft/teams | list-channel-messages | new-channel-message | apps/microsoft/teams/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-channel-messages |
| apps/miro | board-list | new-board-list | no | scan | list action board-list has pagination and order/since params |
| apps/missive | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/mixmax | unsubscribe-list | new-unsubscribe | no | hand | shipped poll trigger(s) over list action unsubscribe-list |
| apps/mixpanel | activity-list | new-activity-list | no | scan | list action activity-list has pagination and order/since params |
| apps/moco | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/mollie | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/mongodb-atlas | event-list | new-event-list | no | scan | list action event-list has pagination and order/since params |
| apps/mural | mural-list | new-mural-list | no | scan | list action mural-list has pagination and order/since params |
| apps/mux | asset-list | new-asset-list | no | scan | list action asset-list has pagination and order/since params |
| apps/nationbuilder | person-list | new-person-list | no | scan | list action person-list has pagination and order/since params |
| apps/ninox | record-list | new-or-updated-record | apps/ninox/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action record-list |
| apps/nocodb | record-list | new-record-list | no | scan | list action record-list has pagination and order/since params |
| apps/nocrm | lead-get-many | new-lead | apps/nocrm/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action lead-get-many |
| apps/notion | get-many-database-pages | new-database-page | apps/notion/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action get-many-database-pages |
| apps/odoo | list-contacts | new-contacts | no | scan | list action list-contacts has pagination and order/since params |
| apps/omnisend | list-contacts | new-contact | apps/omnisend/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-contacts |
| apps/oncehub | sms-notification-list | new-sms-notification-list | no | scan | list action sms-notification-list has pagination and order/since params |
| apps/onepagecrm | list-contacts | new-contact | apps/onepagecrm/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-contacts |
| apps/onepassword | item-file-list | new-item-file-list | no | scan | list action item-file-list has pagination and order/since params |
| apps/outreach | account-list | new-account-list | no | scan | list action account-list has pagination and order/since params |
| apps/paddle | customer-list | new-customer-list | no | scan | list action customer-list has pagination and order/since params |
| apps/pagerduty | incident-list | new-incident | apps/pagerduty/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action incident-list |
| apps/pandadoc | document-get-many | new-document-get-many | no | scan | list action document-get-many has pagination and order/since params |
| apps/pardot | landing-page-list | new-landing-page-list | no | scan | list action landing-page-list has pagination and order/since params |
| apps/parseur | document-list | new-document | apps/parseur/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action document-list |
| apps/particle | device-list | new-device-list | no | scan | list action device-list has pagination and order/since params |
| apps/pdfmonkey | list-documents | new-documents | no | scan | list action list-documents has pagination and order/since params |
| apps/pennylane | list-customer-invoices | new-customer-invoices | no | scan | list action list-customer-invoices has pagination and order/since params |
| apps/perplexity | web-search | new-web-search | no | scan | list action web-search has pagination and order/since params |
| apps/personio | list-employees | new-employees | no | scan | list action list-employees has pagination and order/since params |
| apps/perspective | contact-list | new-contact | apps/perspective/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action contact-list |
| apps/phrase | job-list | new-job-list | no | scan | list action job-list has pagination and order/since params |
| apps/pinecone | record-search | new-record-search | no | scan | list action record-search has pagination and order/since params |
| apps/pinterest | pin-search | new-pin-search | no | scan | list action pin-search has pagination and order/since params |
| apps/placid | template-list | new-template-list | no | scan | list action template-list has pagination and order/since params |
| apps/plaid | institution-list | new-institution-list | no | scan | list action institution-list has pagination and order/since params |
| apps/planningcenter | list-event-instances | new-event-instances | no | scan | list action list-event-instances has pagination and order/since params |
| apps/podio | task-list | new-task-list | no | scan | list action task-list has pagination and order/since params |
| apps/podium | conversation-list | new-conversation | apps/podium/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action conversation-list |
| apps/postgres | query | new-row | no | hand | shipped poll trigger(s) over list action query |
| apps/postmark | list-outbound-messages | new-outbound-message | apps/postmark/README.md Triggers section (verified 2026-11-09) | hand | shipped poll trigger(s) over list action list-outbound-messages |
| apps/printavo | contact-list | new-contact-list | no | scan | list action contact-list has pagination and order/since params |
| apps/printful | order-list | new-order-list | no | scan | list action order-list has pagination and order/since params |
| apps/processstreet | user-list | new-user-list | no | scan | list action user-list has pagination and order/since params |
| apps/procore | submittal-list | new-submittal-list | no | scan | list action submittal-list has pagination and order/since params |
| apps/productboard | member-activity-list | new-member-activity-list | no | scan | list action member-activity-list has pagination and order/since params |
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

## none (252)

| app | candidates | verified | source | reason |
|---|---|---|---|---|
| apps/2chat |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/accelo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/acumbamail |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/adalo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/adyen |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/airparser |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/airtop |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/amplitude |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/anthropic |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/apitemplateio |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/assemblyai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/atlassian/jira-service-management |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/autotask |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/aws/s3 |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/aws/ses |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/bannerbear |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/basecamp |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/betterstack |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/bitly |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/bitwarden |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/blandai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/bloomerang |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/brandfetch |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/brex |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/browserless |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/chatbase |  | apps/chatbase/README.md Triggers section (verified 2026-11-09) | hand | conversation-list is ordered by createdAt with no documented direction and the action exposes no sort or since filter (https://chatbase.co/docs/api-reference/v2/conversations/list-conversations.md) |
| apps/checkly |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/circleci |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/clearbit |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/clearout |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/clientify |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/clockodo |  | apps/clockodo/README.md Triggers section (verified 2026-11-09) | hand | list-entries requires a time_since/time_until window over the entry's own time with no created/updated filter or sort, so back-dated entries never look new (https://www.clockodo.com/en/api/) |
| apps/cloudconvert |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/cloudflare |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/cloze |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/cognitoforms |  | no | scan | no newest-first list action found by scan; vendor events not researched |
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
| apps/folk |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/formbricks |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/formspark |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/formstack-documents |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/freshbooks |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/fullenrich |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/gcs |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/giphy |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/glide |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/gocanvas |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/gemini |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/google-analytics |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/google-docs |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/google-maps |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/google-meet |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/google-slides |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/google-tasks |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/google-vertex-ai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/googlesearchconsole |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/google/looker |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/goto-webinar |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/grafana |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/groq |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/hackernews |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/heartbeat |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/hedy |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/heygen |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/hibob |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/highlevel |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/holded |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/homeassistant |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/htmlcsstoimage |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/hyros |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/insightly |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/instapaper |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/jenkins |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/jev |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/jinaai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/judgeme |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/klaviyo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/klicktipp |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/klipfolio |  | no | scan | no newest-first list action found by scan; vendor events not researched |
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
| apps/lokalise |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/lusha |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/mailcheck |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/mailchimp/mandrill |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/marketo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/mastodon |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/matrix |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/messagebird |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/meta/facebook-conversions |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/meta/facebook-custom-audiences |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/meta/facebook-messenger |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/metricool |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/microsoft/azure-blob |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/microsoft/azuredevops |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/microsoft/powerbi |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/mighty-networks |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/millionverifier |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/mindee |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/mistral |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/monday |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/moneybird |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/moonclerk |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/motion |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/msg91 |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/murf |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/netsuite |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/neverbounce |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/newrelic |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/nutshell |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/okta |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/ollama |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/ollama-cloud |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/onesignal |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/onesimpleapi |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/ontraport |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/openai |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/openrouter |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/opusclip |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/otter |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/outseta |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/paperform |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/patreon |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/payhip |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/paystack |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/pdfco |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/pendo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/peopledatalabs |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/phantombuster |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/pipefy |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/plaud |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/plivo |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/postbin |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/posthog |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/practicebetter |  | no | scan | no newest-first list action found by scan; vendor events not researched |
| apps/printnode |  | no | scan | no newest-first list action found by scan; vendor events not researched |
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
