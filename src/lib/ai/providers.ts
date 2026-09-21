import type { LlmProviderId } from "../types";

export interface LlmProviderMeta {
  id: LlmProviderId;
  name: string;
  baseUrl: string;
  chatModel: string;
  imageModel: string;
  hint: string;
}

export const LLM_PROVIDERS: LlmProviderMeta[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    chatModel: "gpt-4o-mini",
    imageModel: "dall-e-3",
    hint: "Chat Completions + DALL·E 生图",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    chatModel: "deepseek-chat",
    imageModel: "",
    hint: "国内可直连，写稿很快；生图走本地封面",
  },
  {
    id: "tongyi",
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    chatModel: "qwen-plus",
    imageModel: "wanx-v1",
    hint: "阿里云 DashScope，兼容 OpenAI 协议",
  },
  {
    id: "moonshot",
    name: "Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    chatModel: "moonshot-v1-auto",
    imageModel: "",
    hint: "长文写稿",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    chatModel: "glm-4-flash",
    imageModel: "cogview-3-flash",
    hint: "写稿 + CogView 生图",
  },
  {
    id: "ollama",
    name: "Ollama 本地",
    baseUrl: "http://127.0.0.1:11434/v1",
    chatModel: "qwen2.5",
    imageModel: "",
    hint: "Docker 内请把地址改成 http://host.docker.internal:11434/v1",
  },
  {
    id: "custom",
    name: "自定义兼容接口",
    baseUrl: "",
    chatModel: "",
    imageModel: "",
    hint: "任意 OpenAI 兼容网关，例如硅基流动 / OneAPI",
  },
];

export const DEFAULT_LLM = {
  provider: "deepseek" as LlmProviderId,
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  chatModel: "deepseek-chat",
  imageModel: "",
};
