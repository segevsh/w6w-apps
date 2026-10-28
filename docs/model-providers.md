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
| gemini | llm, embedding / — | `apps/google/gemini/actions/generate-content.ts` (llm), `embed-content.ts`, `batch-embed-contents.ts` (embedding) | generate-content is text-oriented here; no image/speech action declared. count-tokens is not inference. |
| groq | llm, speech-to-text, text-to-speech / — | `apps/groq/actions/chat-complete.ts`, `response-create.ts` (llm), `audio-transcribe.ts`, `audio-translate.ts` (speech-to-text), `audio-speech.ts` (text-to-speech) | Batch/files/models are not inference types. |
| mistral | llm, embedding / — | `apps/mistral/actions/chat-completion.ts` (llm), `embeddings.ts` (embedding) | `extract-text.ts` calls Mistral OCR (a model), but no `MODEL_TYPES` entry describes document OCR. `list-models.ts` is not inference. |
| xai | llm, embedding, image-generation / — | `apps/xai/actions/chat-complete.ts`, `create-response.ts`, `create-message.ts` (llm), `create-embedding.ts` (embedding), `generate-image.ts` (image-generation) | `tokenize-text.ts` is a tokenizer call, not an inference type. `list-models.ts`, `get-model.ts`, `list-language-models.ts` and the files actions are not inference. |
| perplexity | llm, embedding / — | `apps/perplexity/actions/chat-completion.ts` (Sonar), `agent-response.ts` (Agent API) (llm), `create-embeddings.ts` (embedding) | `web-search.ts` is search-only (ranked results and page content, no model output of any declared type). The web grounding in the Sonar/Agent calls is retrieval around an llm, so it adds no type. `list-models.ts` is not inference. |
| huggingface | llm / — | `apps/huggingface/actions/chat-complete.ts` (POST router.huggingface.co/v1/chat/completions) | Only chat inference is an action; model/dataset/space search, repo and file actions and `inference-model-list.ts` are Hub management or discovery. The router can serve other tasks, but no action calls them. |
| replicate | not designated | — | Generic run-any-model app: `prediction-create.ts`, `prediction-create-from-model.ts` and `deployment-prediction-create.ts` run whatever model the caller names, so no single model type is evident from the actions (output could be image, audio, text...). Declaring any type would be a guess and "all types" is forbidden; left undeclared. Other actions are catalogue, training and account management. |
| elevenlabs | text-to-speech, speech-to-text, audio-generation / — | `apps/elevenlabs/actions/text-to-speech.ts`, `text-to-speech-with-timestamps.ts` (text-to-speech), `speech-to-text.ts` (speech-to-text), `sound-generation.ts` (audio-generation, POST /v1/sound-generation) | Voice, history, studio-project, subscription, usage and model-list actions are management, not inference. |
