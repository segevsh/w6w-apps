# Model-provider designations

Audit of the 12 candidate AI apps against their own actions. An app declares `w6w.modelProvider`
only when its actions perform model inference. Declarations are never derived from `categories`.
`modelFamilies` is omitted everywhere so far (unknown): no vendor page was cited for an architecture
family, and omission is the safe reading.

| app | declared types / families | backing action files | not declared + why |
|---|---|---|---|
| openai | llm, embedding, moderation, image-generation, speech-to-text / — | `apps/openai/actions/chat-complete.ts` (llm), `embeddings-create.ts` (embedding), `moderations-create.ts` (moderation), `image-generate.ts`, `image-edit.ts`, `image-variation.ts` (image-generation), `audio-transcribe.ts`, `audio-translate.ts` (speech-to-text) | text-to-speech: no speech action. Files/list-models actions are not inference. |
| anthropic | llm / — | `apps/anthropic/actions/message-create.ts` | embedding etc.: no such action. Batch, files, count-tokens, models are not direct inference types. |
| deepseek | llm / — | `apps/deepseek/actions/chat-complete.ts`, `fim-complete.ts` | No other inference actions; balance/list-models are not inference. |
| ollama | llm, embedding / — | `apps/ollama/actions/chat.ts`, `generate.ts` (llm), `embed.ts` (embedding) | Model management actions (pull/copy/delete/show) are not inference. |
| gemini | llm, embedding / — | `apps/gemini/actions/generate-content.ts` (llm), `embed-content.ts`, `batch-embed-contents.ts` (embedding) | generate-content is text-oriented here; no image/speech action declared. count-tokens is not inference. |
| groq | llm, speech-to-text, text-to-speech / — | `apps/groq/actions/chat-complete.ts`, `response-create.ts` (llm), `audio-transcribe.ts`, `audio-translate.ts` (speech-to-text), `audio-speech.ts` (text-to-speech) | Batch/files/models are not inference types. |
| mistral | TODO S2/S3 | TODO S2/S3 | TODO S2/S3 |
| xai | TODO S2/S3 | TODO S2/S3 | TODO S2/S3 |
| perplexity | TODO S2/S3 | TODO S2/S3 | TODO S2/S3 |
| huggingface | TODO S2/S3 | TODO S2/S3 | TODO S2/S3 |
| replicate | TODO S2/S3 | TODO S2/S3 | TODO S2/S3 |
| elevenlabs | TODO S2/S3 | TODO S2/S3 | TODO S2/S3 |
