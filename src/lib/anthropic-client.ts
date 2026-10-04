import Anthropic from "@anthropic-ai/sdk";
import type { CreateMessage } from "./generate-lesson";

export function makeCreateMessage(apiKey: string): CreateMessage {
  const client = new Anthropic({ apiKey, maxRetries: 2 });
  return (params, { signal }) => client.beta.messages.create(params, { signal });
}
