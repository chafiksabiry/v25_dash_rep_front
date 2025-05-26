import OpenAI from 'openai';

/**
 * Gets ISO 639-1 language code for a given language name using OpenAI
 * 
 * @param {string} language - The language name to get the code for
 * @param {OpenAI} openaiClient - OpenAI client instance
 * @returns {Promise<string>} - The ISO 639-1 two-letter language code
 */
export const getLanguageCodeFromAI = async (language: string, openaiClient: OpenAI): Promise<string> => {
  try {
    const response = await openaiClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a language expert. Given a language name or identifier, return ONLY the corresponding ISO 639-1 two-letter language code. 
          For example:
          - "English" -> "en"
          - "français" -> "fr"
          - "中文" -> "zh"
          - "العربية" -> "ar"
          Return ONLY the two-letter code, nothing else.`
        },
        {
          role: "user",
          content: language
        }
      ],
      temperature: 0.1,
      max_tokens: 2 // We only need 2 characters
    });

    const languageCode = response.choices[0].message.content.trim().toLowerCase();
    
    // Simple validation - check if it's exactly 2 characters
    if (languageCode.length === 2 && /^[a-z]{2}$/.test(languageCode)) {
      return languageCode;
    }
    
    throw new Error(`Invalid language code returned: ${languageCode}`);
  } catch (error) {
    console.error('Error getting language code from AI:', error);
    return ""; // Return empty string as default
  }
}; 