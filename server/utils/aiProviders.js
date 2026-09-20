import axios from "axios";

// ── DeepSeek (primary chat) ──
export async function askDeepSeek(messages, opts = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY missing");
  const res = await axios.post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
    },
    {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      timeout: 30000,
    }
  );
  return res.data?.choices?.[0]?.message?.content || "";
}

// ── OpenAI (chat fallback + vision) ──
export async function askOpenAI(messages, opts = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: opts.model || process.env.OPENAI_MODEL || "gpt-4o",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1500,
    },
    {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      timeout: 30000,
    }
  );
  return res.data?.choices?.[0]?.message?.content || "";
}

// ── OpenAI Vision (image URL) ──
export async function askOpenAIVision({ imageUrl, prompt, model }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: model || "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt || "Describe this image and give concrete next steps related to jobs or hiring." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1200,
    },
    {
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      timeout: 45000,
    }
  );
  return res.data?.choices?.[0]?.message?.content || "";
}

// ── Chat with priority: DeepSeek → OpenAI ──
export async function askChat(messages, opts = {}) {
  try {
    const text = await askDeepSeek(messages, opts);
    if (text && text.trim()) return { text, provider: "deepseek" };
    throw new Error("Empty DeepSeek response");
  } catch (e) {
    console.warn("[ai] DeepSeek failed, trying OpenAI:", e.message);
    const text = await askOpenAI(messages, opts);
    return { text, provider: "openai" };
  }
}

// ── Voice transcribe: Deepgram → OpenAI Whisper ──
export async function transcribeAudio({ buffer, mimeType }) {
  // 1. Deepgram
  if (process.env.DEEPGRAM_API_KEY) {
    try {
      const url = `${process.env.DEEPGRAM_API_URL || "https://api.deepgram.com/v1/listen"}?model=nova-2&smart_format=true&punctuate=true`;
      const res = await axios.post(url, buffer, {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": mimeType || "audio/webm",
        },
        timeout: 45000,
      });
      const text = res.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      if (text.trim()) return { text: text.trim(), provider: "deepgram" };
    } catch (e) {
      console.warn("[ai] Deepgram failed:", e.message);
    }
  }

  // 2. OpenAI Whisper fallback
  if (process.env.OPENAI_API_KEY) {
    try {
      const FormData = (await import("form-data")).default;
      const form = new FormData();
      form.append("file", buffer, { filename: "audio.webm", contentType: mimeType || "audio/webm" });
      form.append("model", "whisper-1");
      const res = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...form.getHeaders() },
        timeout: 60000,
      });
      const text = res.data?.text || "";
      if (text.trim()) return { text: text.trim(), provider: "openai-whisper" };
    } catch (e) {
      console.warn("[ai] OpenAI Whisper failed:", e.message);
    }
  }

  throw new Error("All transcription providers failed");
}
