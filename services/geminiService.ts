
import { GoogleGenAI } from "@google/genai";

export const streamContinuation = async (
  currentText: string,
  instruction: string | undefined,
  onChunk: (text: string) => void
): Promise<void> => {
  const apiKey = process.env.API_KEY;
  
  // Fallback for demo purposes if no API key is present
  if (!apiKey) {
    console.warn("No API_KEY found in process.env. Simulating response.");
    const mockResponse = instruction 
      ? ` [Simulated output for instruction: "${instruction}"] The system processed the request and began to weave a new narrative thread, intricately detailed and perfectly aligned with the user's intent.` 
      : " ...and then, seemingly out of nowhere, the horizon began to shimmer with an iridescent glow. It wasn't just light; it was a promise of a new dawn, a digital awakening that would change the course of history forever. The data streams coalesced into a tangible form, a bridge between the physical and the virtual.";
    
    // Split for chunk simulation
    const chunks = mockResponse.split(/(?=\s)/); 
    
    // FAST MOCK RESPONSE
    for (const chunk of chunks) {
      // Much faster delay (10-30ms) to feel "instant"
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
      onChunk(chunk);
    }
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    let promptContent = "";
    let systemInstruction = "";

    // Determine if this is a continuation or a fresh request
    const hasContext = currentText && currentText.trim().length > 0;

    if (instruction) {
      if (hasContext) {
         // We have both context and instruction -> "Continue this, but like this..."
         promptContent = `Context (the story so far):\n"${currentText}"\n\nUser Instruction:\n"${instruction}"`;
         systemInstruction = "You are an intelligent writing assistant. The user has provided a specific instruction. Continue the text adhering strictly to that instruction. Maintain the existing tone and style.";
      } else {
         // No context, just instruction -> "Write me a story about X..."
         promptContent = instruction;
         systemInstruction = "You are a creative AI writing assistant. Generate high-quality, rich text based on the user's prompt.";
      }
    } else {
      // No instruction, just context -> "Keep going..."
      if (hasContext) {
        promptContent = currentText;
        systemInstruction = "You are a creative writing assistant. Continue the provided text naturally. Match the tone, style, and flow. Do not repeat the input text.";
      } else {
        // Edge case: Empty editor, no instruction.
        promptContent = "Start a story about a futuristic digital world.";
        systemInstruction = "You are a creative writing assistant.";
      }
    }

    // Using flash model for low latency text generation
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: promptContent }]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        maxOutputTokens: 1000,
        temperature: 0.7, // Slightly creative but focused
      }
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        onChunk(text);
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
