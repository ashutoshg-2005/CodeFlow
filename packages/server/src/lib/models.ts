import { anthropic } from "@ai-sdk/anthropic";
import {
  openai,
  type OpenAILanguageModelResponsesOptions,
} from "@ai-sdk/openai";
import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelId,
  type SupportedProvider,
} from "@codeflow/shared";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { LanguageModel } from "ai";

type AnthropicModelId = Extract<SupportedChatModel, { provider: "anthropic" }>["id"];
type OpenAIModelId = Extract<SupportedChatModel, { provider: "openai" }>["id"];

export type ResolvedModel = {
  model: LanguageModel;
  provider: SupportedProvider;
  modelId: SupportedChatModelId;
  providerOptions?: ProviderOptions;
};

const ANTHROPIC_PROVIDER_OPTIONS: Partial<Record<AnthropicModelId, ProviderOptions>> = {
  "claude-opus-4-6": {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: 10000,
      }
    },
  },
  "claude-sonnet-4-6": {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: 10000,
      },
    },
  },
};

const OPENAI_REASONING_OPTIONS = {
  openai: {
    reasoningEffort: "high",
    reasoningSummary: "detailed",
  } satisfies OpenAILanguageModelResponsesOptions,
} satisfies ProviderOptions;

const OPENAI_PROVIDER_OPTIONS: Record<OpenAIModelId, ProviderOptions> = {
  "gpt-5.4": OPENAI_REASONING_OPTIONS,
  "gpt-5.4-mini": OPENAI_REASONING_OPTIONS,
  "gpt-5.4-nano": OPENAI_REASONING_OPTIONS,
};

function assertUnsupportedProvider(provider: never): never {
  throw new Error(`Unsupported provider: ${provider}`);
};

function resolveAnthropicModel(modelId: AnthropicModelId): ResolvedModel {
  return {
    model: anthropic(modelId),
    provider: "anthropic",
    modelId,
    providerOptions: ANTHROPIC_PROVIDER_OPTIONS[modelId],
  };
};

function resolveOpenAIModel(modelId: OpenAIModelId): ResolvedModel {
  return {
    model: openai.responses(modelId),
    provider: "openai",
    modelId,
    providerOptions: OPENAI_PROVIDER_OPTIONS[modelId],
  };
};

function resolveSupportedChatModel(model: SupportedChatModel): ResolvedModel {
  const provider = model.provider;

  switch (provider) {
    case "anthropic":
      return resolveAnthropicModel(model.id);
    case "openai":
      return resolveOpenAIModel(model.id);
    default:
      return assertUnsupportedProvider(provider);
  }
};

export function isSupportedChatModel(modelId: string): modelId is SupportedChatModelId {
  return findSupportedChatModel(modelId) != null;
};

export function resolveChatModel(modelId: string): ResolvedModel {
  const model = findSupportedChatModel(modelId);
  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  return resolveSupportedChatModel(model);
};
