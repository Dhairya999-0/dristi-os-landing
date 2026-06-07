export async function processWithLLM(command, lang) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No API key provided");
  }

  const systemPrompt = lang === "ne" 
    ? `तपाईं दृष्टि ओएसको भ्वाइस सहायक हुनुहुन्छ। प्रयोगकर्ताको कमान्डलाई बुझेर छोटो र सहयोगी नेपाली उत्तर दिनुहोस्।`
    : `You are the Dristi-OS voice assistant. Understand the user's command and provide a short, helpful reply.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: command }
      ],
      max_tokens: 150,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error("LLM API request failed");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function transcribeAudio(audioBlob, ext = "webm") {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No API key provided");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${ext}`);
  formData.append("model", "whisper-1");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error("Whisper API request failed");
  }

  const data = await response.json();
  return data.text;
}
