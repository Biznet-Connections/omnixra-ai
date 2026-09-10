import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

export const askAI = async (messages) => {
  // Try DeepSeek first
  try {
    console.log("Trying DeepSeek...");
    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        timeout: 15000
      }
    );
    console.log("DeepSeek response received");
    return response.data.choices[0].message.content;
  } catch (deepseekError) {
    console.log("DeepSeek failed:", deepseekError.response?.data?.error?.message || deepseekError.message);
    
    // Fallback to OpenAI
    try {
      console.log("Falling back to OpenAI...");
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          timeout: 15000
        }
      );
      console.log("OpenAI response received");
      return response.data.choices[0].message.content;
    } catch (openaiError) {
      console.error("OpenAI also failed:", openaiError.response?.data?.error?.message || openaiError.message);
      throw new Error("AI service unavailable");
    }
  }
};
