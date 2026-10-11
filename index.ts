import {
  createToolHandler,
  defineToolSet,
  type InputSchemaMetaType,
  type OutputSchemaMetaType,
  type SecretSchemaMetaType
} from '@fastgpt-plugin/sdk-factory';
import z from 'zod';

import { submitGeneration, retrieveTask } from './src/client.ts';

const secretSchema = z.object({
  apiKey: z.string().min(1).meta({
    title: 'Ace Data Cloud API key',
    description: 'Create an application API key at platform.acedata.cloud. Do not include Bearer.',
    isSecret: true
  } satisfies SecretSchemaMetaType)
});

const outputSchema = z.object({
  taskId: z.string().meta({ title: 'Task ID' } satisfies OutputSchemaMetaType),
  traceId: z.string().meta({ title: 'Trace ID' } satisfies OutputSchemaMetaType),
  status: z.enum(['pending', 'succeeded', 'failed']).meta({ title: 'Task status' } satisfies OutputSchemaMetaType),
  success: z.boolean().meta({ title: 'Succeeded' } satisfies OutputSchemaMetaType),
  mediaUrls: z.array(z.string()).meta({ title: 'Media URLs' } satisfies OutputSchemaMetaType),
  costCredits: z.number().nullable().meta({ title: 'Reported Credits' } satisfies OutputSchemaMetaType)
});

const generateHandler = createToolHandler({
  inputSchema: z.object({
    prompt: z.string().trim().min(1).max(10000).meta({ title: 'Prompt', isToolParam: true } satisfies InputSchemaMetaType),
    model: z.string().trim().min(1).max(256).default('qwen-image-3.0').meta({ title: 'Model' } satisfies InputSchemaMetaType),
    size: z.string().trim().min(1).max(256).default('1024*1024').meta({ title: 'Size' } satisfies InputSchemaMetaType),
    n: z.number().int().min(1).max(6).default(1).meta({ title: 'N' } satisfies InputSchemaMetaType),
    watermark: z.boolean().default(false).meta({ title: 'Watermark' } satisfies InputSchemaMetaType),
  }),
  outputSchema,
  secretSchema,
  handler: async (input, ctx) => submitGeneration(input, ctx.secrets?.apiKey ?? '')
});

const retrieveHandler = createToolHandler({
  inputSchema: z.object({
    taskId: z.string().trim().min(1).meta({
      title: 'Task ID',
      description: 'Bind to Generate → Task ID. Querying this ID does not generate again.',
      isToolParam: true
    } satisfies InputSchemaMetaType)
  }),
  outputSchema,
  secretSchema,
  handler: async (input, ctx) => retrieveTask(input.taskId, ctx.secrets?.apiKey ?? '')
});

export default defineToolSet({
  manifest: {
    pluginId: 'acedataQwenImage',
    version: '0.2.0',
    name: { en: 'Ace Data Cloud Qwen Image', 'zh-CN': 'Ace Data Cloud Qwen Image 图像' },
    description: {
      en: 'Generate image with Qwen Image through Ace Data Cloud and retrieve the same task.',
      'zh-CN': '通过 Ace Data Cloud Qwen Image 图像生成并查询同一任务。'
    },
    versionDescription: { en: 'Align API limits and task status handling', 'zh-CN': '对齐 API 限制和任务状态处理' },
    author: 'Ace Data Cloud',
    repoUrl: 'https://github.com/AceDataCloud/QwenImageFastGPT',
    tutorialUrl: 'https://github.com/AceDataCloud/QwenImageFastGPT#quick-start',
    tags: ['multimodal'],
    permission: []
  },
  secretSchema,
  children: [
    {
      id: 'generate',
      name: { en: 'Generate image', 'zh-CN': '生成Qwen Image 图像' },
      description: { en: 'Submit one Qwen Image generation and return its task ID.', 'zh-CN': '提交一次Qwen Image 图像生成并返回任务 ID。' },
      toolDescription: 'Submit once. Do not call again to check a pending task.',
      handler: generateHandler
    },
    {
      id: 'retrieveTask',
      name: { en: 'Retrieve task', 'zh-CN': '查询任务' },
      description: { en: 'Read the status and result of an existing Qwen Image task.', 'zh-CN': '读取已有Qwen Image 图像任务的状态和结果。' },
      toolDescription: 'Read an existing task by ID without submitting a new generation.',
      handler: retrieveHandler
    }
  ]
});
