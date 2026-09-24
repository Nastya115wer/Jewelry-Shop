// services/aiService.js
require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Проверка ключа при старте — сервер не запустится без него
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ CRITICAL: OPENAI_API_KEY не установлен!');
  process.exit(1);
}

/**
 * Базовый запрос к LLM
 */
async function askAI(prompt, systemPrompt = 'Ты — полезный ассистент ювелирного магазина Luxe Jewelry.') {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Дешевая и быстрая модель для MVP
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('AI Service Error:', error.message);
    throw new Error('Не удалось получить ответ от AI');
  }
}

module.exports = { askAI };
