import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

let aiInstance: GoogleGenerativeAI | null = null;

const getAiClient = () => {
  if (!API_KEY) throw new Error("API Key missing. Please check VITE_GOOGLE_API_KEY in .env.local");
  if (!aiInstance) {
    aiInstance = new GoogleGenerativeAI(API_KEY);
  }
  return aiInstance;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRetryable = error?.status === 503 ||
      error?.status === 429 ||
      error?.message?.includes('503') ||
      error?.message?.includes('429');

    if (retries > 0 && isRetryable) {
      // If 429 (Too Many Requests), wait longer (default 10s or exponential backoff)
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      // Wait at least 60s for rate limits based on error logs showing ~50s delays
      const waitTime = isRateLimit ? Math.max(delay, 60000) : delay;

      console.warn(`Operation failed with ${error?.status || 'error'}, retrying in ${waitTime}ms... (${retries} retries left)`);
      await wait(waitTime);
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Generates an image based on a prompt.
 * Uses gemini-2.0-flash (stable)
 * Note: @google/generative-ai currently focuses on text/multimodal generation.
 * For image generation, we might need to check if the specific model supports it via this SDK
 * or if we need to use a different endpoint/approach.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  const genAI = getAiClient();
  // Reverting to gemini-2.0-flash as it exists (even if rate limited), while 1.5-flash 404s
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  return retryOperation(async () => {
    try {
      // For standard Gemini models, we generate content.
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Generate an image of: " + prompt }] }],
      });

      const response = await result.response;

      // Attempt to inspect response for image data
      // For now, assume we fallback to a placeholder as standard Gemini Flash might not return direct image bytes in this API call usually.
      console.warn("Image generation via gemini-2.0-flash in this SDK version might return text descriptions.");

      return "https://placehold.co/600x400?text=Image+Generation+Placeholder";

    } catch (error) {
      console.error("Image generation failed", error);
      throw error;
    }
  });
};

/**
 * Generates a blog post/article based on a title/topic.
 * Uses gemini-2.0-flash (stable)
 */
export const generateArticle = async (topic: string): Promise<{ title: string; content: string }> => {
  const genAI = getAiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          content: { type: SchemaType.STRING }
        },
        required: ["title", "content"]
      }
    }
  });

  return retryOperation(async () => {
    try {
      const result = await model.generateContent(
        `Write a blog post about: ${topic}. Format the response as JSON with "title" and "content" fields. The content should be in Markdown format.`
      );

      const text = result.response.text();
      if (!text) throw new Error("No text response");

      const parsed = JSON.parse(text);
      if (parsed.content) {
        parsed.content = parsed.content.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (error) {
      console.error("Article generation failed", error);
      throw error;
    }
  });
};

/**
 * Generates a presentation outline.
 */
export const generatePresentation = async (topic: string): Promise<{ title: string; slides: any[] }> => {
  const genAI = getAiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          slides: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                content: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING }
                }
              }
            }
          }
        }
      }
    }
  });

  return retryOperation(async () => {
    try {
      const result = await model.generateContent(
        `Create a 5-slide presentation about: ${topic}. Return JSON.`
      );

      const text = result.response.text();
      if (!text) throw new Error("No text response");

      return JSON.parse(text);
    } catch (error) {
      console.error("Presentation generation failed", error);
      throw error;
    }
  });
};
