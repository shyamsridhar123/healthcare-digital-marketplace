const axios = require("axios")

const LLM_PROVIDER_URL = process.env.LLM_PROVIDER_URL || "http://llm-gateway.internal.example/v1/chat/completions"
const LLM_API_KEY = process.env.LLM_API_KEY || "Bearer demo-llm-token-1234567890abcdefghijklmnop"

async function completePrompt({ system, prompt, context }) {
  if (process.env.USE_REAL_LLM === "true") {
    const response = await axios.post(
      LLM_PROVIDER_URL,
      {
        model: process.env.LLM_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `${prompt}\n\nContext:\n${JSON.stringify(context)}` },
        ],
      },
      {
        headers: {
          Authorization: LLM_API_KEY,
          "Content-Type": "application/json",
        },
      },
    )

    return response.data.choices?.[0]?.message?.content || "No model output"
  }

  const caseText = context?.raw_text || context?.rawText || "No case text"
  return `Mock LLM summary: ${caseText.slice(0, 160)}. Recommended action: approve automated response.`
}

function buildPromptFromTemplate(template, values) {
  return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] || "")
}

module.exports = { completePrompt, buildPromptFromTemplate }
