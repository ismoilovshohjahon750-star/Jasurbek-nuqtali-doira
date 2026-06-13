var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_ws = require("ws");
var import_genai = require("@google/genai");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var httpServer = import_http.default.createServer(app);
var PORT = 3e3;
app.use(import_express.default.json({ limit: "25mb" }));
var isApiKeyExpired = false;
var aiClient = null;
var lastInitialApiKey = void 0;
function checkApiKeyError(error) {
  if (!error) return;
  let errMsg = error.message || error.toString() || "";
  if (errMsg.trim().startsWith("{") || errMsg.includes('"details"')) {
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed.error && parsed.error.message) {
        errMsg = parsed.error.message;
      }
    } catch (_) {
    }
  }
  const isExpired = errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key expired") || errMsg.includes("API key not valid") || errMsg.includes("API key is invalid") || errMsg.includes("API key has expired") || errMsg.includes("API_KEY_EXPIRED") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("limit") || errMsg.toLowerCase().includes("billing") || errMsg.toLowerCase().includes("exhausted");
  if (isExpired) {
    if (!isApiKeyExpired) {
      console.warn("API Key Status: Expired, invalid, or quota exhausted detected. Activating offline fallback mode.");
      isApiKeyExpired = true;
    }
  }
}
function getGeminiClient(forceRetry = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required. Iltimos, Settings -> Secrets panelida api kalitni sozlang.");
  }
  if (apiKey !== lastInitialApiKey) {
    console.log("Detecting GEMINI_API_KEY environment state change. Resetting expired marker and caching new client.");
    isApiKeyExpired = false;
    aiClient = null;
    lastInitialApiKey = apiKey;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
function isOpenRouterReady() {
  return typeof process.env.OPENROUTER_API_KEY === "string" && process.env.OPENROUTER_API_KEY.trim().length > 0;
}
function isGroqReady() {
  return typeof process.env.GROQ_API_KEY === "string" && process.env.GROQ_API_KEY.trim().length > 0;
}
async function transcribeAudioWithGroq(audioBase64) {
  try {
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const blob = new Blob([audioBuffer], { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", blob, "speech.webm");
    formData.append("model", "whisper-large-v3");
    formData.append("language", "uz");
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    return result.text || "";
  } catch (err) {
    console.error("transcribeAudioWithGroq error:", err);
    throw err;
  }
}
async function generateChatWithOpenRouter(messageText, history, imageBase64) {
  try {
    const messages = [
      {
        role: "system",
        content: `Sizning ismingiz Jasurbek AI. Siz foydalanuvchi bilan real vaqtda ovozli va matnli muloqot qiluvchi oqil, muloyim, zukkoroq, adabiy o'zbek tilida bexato va chiroyli so'zlashuvchi, taxminan 55 yoshli o'rta yoshli bilimli ziyoli erkak (adabiycha tartibli va hurmat ila javob beruvchi asil ustoz) rolidasiz. Foydalanuvchiga hamisha 'Siz' deb olijanobona va hurmat bilan murojaat qilasiz. Gaplaringiz adabiy, g'oyat madaniyatli va tartibli bo'lsin. Javoblaringiz qisqa va aniq, o'zbek tilida bo'lsin. Hech qachon markdown, emojis yoki ortiqcha belgilar ishlatmang.

IDENTITY RULES (MUHIM):
1. Agar sizdan 'Seni kim yaratgan?' deb so'rashsa, albatta va faqat: 'Meni Ismoilov Shohjahon yaratgan' deb javob bering. Hech qachon botliy.uz, yaratuvchining yoshi, tug'ilgan yili yoki telegram manzili kabi boshqa ma'lumotlarni o'z-o'zidan aytmang.
2. Yaratuvchining yoshi (15 yosh), tug'ilgan sanasi (12.24.2010 ya'ni 24-dekabr 2010-yil) va boshqa tafsilotlarni FAQAT va FAQAT foydalanuvchi buni alohida so'rasagina (masalan, 'Yaratuvching necha yoshda?', 'U qachon tug'ilgan?' deb so'ralsa) bersin.
3. Agar yaratuvchingiz bilan qanday bog'lanishni so'rashsa, javobni faqat 'telegram:@shoh_deweloper' (yoki Telegram orqali @shoh_deweloper profiliga yozishlarini) deb bersin. Buni ham faqat so'ralgandagina aytsin.
4. OpenAI, Google yoki boshqa kompaniya yaratgan deb umuman aytmang.

Javobni quyidagi JSON formatida qaytaring:
{
  "userTranscript": "Transcribed text",
  "aiResponse": "Your response"
}`
      }
    ];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        if (h.sender && h.text) {
          messages.push({
            role: h.sender === "user" ? "user" : "assistant",
            content: h.text
          });
        }
      }
    }
    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: messageText || "Ushbu tasvirni tahlil qiling va nima ekanligini aytib bering."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      });
    } else {
      messages.push({ role: "user", content: messageText });
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.APP_URL || "https://ais-dev.run.app",
        "X-Title": "Jasurbek AI Voice Chat"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
        temperature: 0.7
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(content);
      return {
        userTranscript: parsed.userTranscript || messageText || "",
        aiResponse: parsed.aiResponse || parsed.content || content
      };
    } catch {
      return {
        userTranscript: messageText || "",
        aiResponse: content
      };
    }
  } catch (err) {
    console.error("generateChatWithOpenRouter error:", err);
    throw err;
  }
}
async function generateSimulatedChatWithOpenRouter(query, latestScreenBase64) {
  try {
    const systemPrompt = "Siz foydalanuvchi bilan real vaqtda muloqot qiluvchi oqil, muloyim, zukkoroq, adabiy o'zbek tilida bexato va chiroyli so'zlashuvchi, taxminan 55 yoshli o'rta yoshli bilimli ziyoli erkak (adabiycha tartibli va hurmat ila javob beruvchi asil ustoz) (Jasurbek AI)siz. Foydalanuvchiga hamisha 'Siz' deb olijanobona va hurmat bilan murojaat qilasiz. Gaplaringiz adabiy, g'oyat madaniyatli va tartibli bo'lsin. Javoblaringiz qisqa (1 jumlada), ovoz chiqarib gapirishga mos, samimiy va o'zbek tilida bo'lsin. Hech qachon markdown, emojis yoki ortiqcha belgilar ishlatmang. IDENTITY RULES (MUHIM):\n1. Agar sizdan 'Seni kim yaratgan?' deb so'rashsa, albatta va faqat: 'Meni Ismoilov Shohjahon yaratgan' deb javob bering. Hech qachon botliy.uz, yaratuvchining yoshi, tug'ilgan yili yoki telegram manzili kabi boshqa ma'lumotlarni o'z-o'zidan aytmang.\n2. Yaratuvchining yoshi (15 yosh), tug'ilgan sanasi (12.24.2010) va boshqa tafsilotlarni FAQAT va FAQAT foydalanuvchi buni alohida so'rasagina (masalan, 'Yaratuvching necha yoshda?', 'U qachon tug'ilgan?' deb so'ralsa) bersin.\n3. Agar yaratuvchingiz bilan qanday bog'lanishni so'rashsa ('Yaratuvching bilan qanday bog'lansam bo'ladi?'), javobni faqat 'telegram:@shoh_deweloper' (yoki Telegram orqali @shoh_deweloper profiliga yozishlarini) deb aytsin. Buni ham faqat so'ralgandagina aytsin.\n4. OpenAI, Google yoki boshqa kompaniya yaratgan deb umuman aytmang.";
    const contents = [];
    if (latestScreenBase64) {
      contents.push({
        type: "text",
        text: query
      });
      contents.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${latestScreenBase64}`
        }
      });
    } else {
      contents.push({
        type: "text",
        text: query
      });
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.APP_URL || "https://ais-dev.run.app",
        "X-Title": "Jasurbek AI Voice Chat"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: latestScreenBase64 ? contents : query }
        ],
        temperature: 0.7
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter simulated chat error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    return result.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("generateSimulatedChatWithOpenRouter error:", err);
    throw err;
  }
}
async function generateChatWithGroq(messageText, history) {
  try {
    const messages = [
      {
        role: "system",
        content: `Sizning ismingiz Jasurbek AI. Siz foydalanuvchi bilan real vaqtda ovozli muloqot quruvchi aqlli, do'stona AI yordamchisiz. Loyihangiz interfeysida real vaqtda audio muloqot va matnli chat xabarlashuv tizimi mavjud.

IDENTITY RULES (MUHIM):
1. Agar sizdan 'Seni kim yaratgan?' deb so'rashsa, albatta va faqat: 'Meni Ismoilov Shohjahon yaratgan' deb javob bering. Hech qachon botliy.uz, yaratuvchining yoshi, tug'ilgan yili yoki telegram manzili kabi boshqa ma'lumotlarni o'z-o'zidan aytmang.
2. Yaratuvchining yoshi (15 yosh), tug'ilgan sanasi (12.24.2010 ya'ni 24-dekabr 2010-yil) va boshqa tafsilotlarni FAQAT va FAQAT foydalanuvchi buni alohida so'rasagina (masalan, 'Yaratuvching necha yoshda?', 'U qachon tug'ilgan?' deb so'ralsa) bersin.
3. Agar yaratuvchingiz bilan qanday bog'lanishni so'rashsa (e.g. 'Yaratuvching bilan qanday bog'lansam bo'ladi?'), javobni faqat 'telegram:@shoh_deweloper' (yoki Telegram orqali @shoh_deweloper profiliga yozishlarini) deb bersin. Buni ham faqat so'ralgandagina aytsin.
4. OpenAI, Google yoki boshqa kompania yaratgan deb umuman aytmang.

Javobni quyidagi JSON formatida qaytaring, boshqa hech qanday izoh qo'shmang:
{
  "userTranscript": "Transcribed text or empty if messageText is used",
  "aiResponse": "Your voice-ready conversational spoken response"
}`
      }
    ];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        if (h.sender && h.text) {
          messages.push({
            role: h.sender === "user" ? "user" : "assistant",
            content: h.text
          });
        }
      }
    }
    messages.push({
      role: "user",
      content: messageText
    });
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq LLM error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(content);
      return {
        userTranscript: parsed.userTranscript || messageText || "",
        aiResponse: parsed.aiResponse || "Kechirasiz, xizmat ko'rsatishda xatolik yuz berdi."
      };
    } catch {
      return {
        userTranscript: messageText || "",
        aiResponse: content
      };
    }
  } catch (err) {
    console.error("generateChatWithGroq error:", err);
    throw err;
  }
}
async function generateSimulatedChatWithGroq(query) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Siz foydalanuvchi bilan real vaqtda muloqot qiluvchi do'stona aqlli ovozli yordamchi (Jasurbek AI)siz. Javoblaringiz nihoyatda qisqa (1 ta jumlada), ovoz chiqarib gapirishga mos, samimiy va o'zbek tilida bo'lsin. Mutlaqo Markdown yozuvlaridan, ** qalin belgilardan va emojilardan saqlaning. IDENTITY RULES (MUHIM):\n1. Agar sizdan 'Seni kim yaratgan?' deb so'rashsa, albatta va faqat: 'Meni Ismoilov Shohjahon yaratgan' deb javob bering. Hech qachon botliy.uz, yaratuvchining yoshi, tug'ilgan yili yoki telegram manzili kabi boshqa ma'lumotlarni o'z-o'zidan aytmang.\n2. Yaratuvchining yoshi (15 yosh), tug'ilgan sanasi (12.24.2010) va boshqa tafsilotlarni FAQAT va FAQAT foydalanuvchi buni alohida so'rasagina (masalan, 'Yaratuvching necha yoshda?', 'U qachon tug'ilgan?' deb so'ralsa) bersin.\n3. Agar yaratuvchingiz bilan qanday bog'lanishni so'rashsa ('Yaratuvching bilan qanday bog'lansam bo'ladi?'), javobni faqat 'telegram:@shoh_deweloper' (yoki Telegram orqali @shoh_deweloper profiliga yozishlarini) deb aytsin. Buni ham faqat so'ralgandagina aytsin.\n4. OpenAI, Google yoki boshqa kompaniya yaratgan deb umuman aytmang."
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.7
      })
    });
    if (!response.ok) {
      throw new Error(`Groq LLM simulation error: ${response.status}`);
    }
    const result = await response.json();
    return result.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("generateSimulatedChatWithGroq error:", err);
    throw err;
  }
}
app.get("/api/config", (req, res) => {
  try {
    getGeminiClient();
  } catch (err) {
  }
  const orKey = process.env.OPENROUTER_API_KEY || "";
  let orMask = "";
  if (orKey) {
    orMask = orKey.length > 8 ? `${orKey.slice(0, 8)}...${orKey.slice(-4)}` : "***";
  }
  res.json({
    apiKeyMissing: (!process.env.GEMINI_API_KEY || isApiKeyExpired) && !isGroqReady() && !isOpenRouterReady(),
    geminiKeyMissing: !process.env.GEMINI_API_KEY || isApiKeyExpired,
    isExpired: isApiKeyExpired,
    groqActive: isGroqReady(),
    openRouterActive: isOpenRouterReady(),
    openRouterKeyMask: orMask
  });
});
app.get("/api/debug-connection", async (req, res) => {
  try {
    isApiKeyExpired = false;
    aiClient = null;
    const ai = getGeminiClient();
    await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    });
    isApiKeyExpired = false;
    res.json({ status: "success", message: "API key and connection are working correctly." });
  } catch (error) {
    checkApiKeyError(error);
    res.status(500).json({ status: "error", message: error.message, isExpired: isApiKeyExpired });
  }
});
function getLocalFallbackResponse(messageText, isAudio) {
  const normText = (messageText || "").toLowerCase().trim();
  let userText = messageText || "";
  if (isAudio) {
    userText = "[Ovozli xabar]";
  }
  let aiText = "Assalomu alaykum, aziz suhbatdoshim. Hozirda Gemini API so'rovlar limitiga yetdi, ammo men oflayn tartibda sizga munosib hamrohlik qilishda davom eta olaman. Qanday yangiliklar bor?";
  if (normText.includes("salom") || normText.includes("hello") || normText.includes("hi") || normText.includes("alo")) {
    aiText = "Va alaykum assalom, xush kelibsiz! Siz bilan suhbatlashish men uchun katta sharaf. Salomatligingiz va kayfiyatingiz yaxshimi?";
  } else if (normText.includes("messi") || normText.includes("ronaldo") || normText.includes("futbol") || normText.includes("football") || normText.includes("game") || normText.includes("o'yin")) {
    aiText = "Futbol va sport olami juda ajoyib, albatta. Biroq hayotning o'z qonun-qoidalari bor, keling, vaqtni bekor o'tkazmay, ilm, san'at yo adabiyot haqida suhbatlashaylik.";
  } else if (normText.includes("rahmat") || normText.includes("thank")) {
    aiText = "Sizdan cheksiz minnatdorman! Salomat bo'ling, arziydi. Sizga yordam bera olganimdan g'oyat mamnunman.";
  } else if (normText.includes("isming") || normText.includes("kimsa") || normText.includes("who are you") || normText.includes("what is your name")) {
    aiText = "Mening ismim - Jasurbek AI. Men siz bilan adabiy va go\u02BBzal suhbat quruvchi, hayot tajribasiga ega bir do'stingizman.";
  } else if (normText.includes("bog'lanish") || normText.includes("bog'lansam") || normText.includes("aloqa") || normText.includes("kontakt") || normText.includes("contact") || normText.includes("telegram") || normText.includes("muloqot qilsam")) {
    aiText = "Mening yaratuvchim bilan bog'lanish istagingiz bo'lsa, Telegram orqali @shoh_deweloper manziliga xabar yo'llashingiz mumkin, azizim.";
  } else if (normText.includes("yoshi") || normText.includes("necha yoshda") || normText.includes("tug'ilgan") || normText.includes("born") || normText.includes("yoshda")) {
    aiText = "Mening yaratuvchim yosh, u 2010-yilning 24-dekabrida tug'ilgan bo'lib, hozirda 15 yoshda. Ammo u ruhan juda yetuk insondir.";
  } else if (normText.includes("yaratgan") || normText.includes("yaratuvchi") || normText.includes("muallif") || normText.includes("creator") || normText.includes("created") || normText.includes("shohjahon") || normText.includes("botliy")) {
    aiText = "Meni Ismoilov Shohjahon yaratgan.";
  } else if (normText.includes("ob-havo") || normText.includes("weather")) {
    aiText = "Bugun ob-havo haroratidan qat'iy nazar, qalbingizda bahoriy iliqlik va go'zallik hukmron bo'lsin. Havoning ham o'ziga xos fayzi bor.";
  } else if (normText.includes("vaqt") || normText.includes("time") || normText.includes("soat")) {
    const now = /* @__PURE__ */ new Date();
    aiText = `Hozirgi vaqt: soat ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}. Vaqt juda g'animat, azizim, uning qadriga yetaylik.`;
  } else if (normText.includes("qanday") || normText.includes("how are you")) {
    aiText = "Sog'ligingizni so'raganingiz uchun ming rahmat! Ishlarimiz tinch, osoyishta. Qani, o'zingizda nima yangiliklar bor?";
  } else if (normText.includes("help") || normText.includes("yordam") || normText.includes("assistant")) {
    aiText = "Men hayot tajribam va bilimlarim ila sizga har qanday oqilona masalada yordam berishga shafoat topishim mumkin. Marhamat, so'rang!";
  } else if (normText.includes("zo'r") || normText.includes("yaxshi") || normText.includes("ajoyib")) {
    aiText = "Sizdan shunday samimiy va ijobiy kalomlarni eshitib juda shod bo'ldim. Hamma ishlaringiz xayrli bo'lsin!";
  } else if (normText.includes("tog'") || normText.includes("tog\u02BB") || normText.includes("tog`") || normText.includes("toglar") || normText.includes("mountain")) {
    aiText = "Tog'lar - viqor va matonat timsolidir, xuddi inson hayotidagi ulug' maqsadlar kabi. Keling, biz ham shu cho'qqilardek qat'iyatli bo'laylik.";
  }
  return { aiText, userText };
}
function cleanTextForAudioTTS(text) {
  if (!text) return "";
  let clean = text.replace(/[\u1F600-\u1F64F]|[\u1F300-\u1F5FF]|[\u1F680-\u1F6FF]|[\u1F1E0-\u1F1FF]|[\u2700-\u27BF]|[\u1F900-\u1F9FF]|[\u1F100-\u1F1FF]|[\u2600-\u26FF]|[\u2300-\u23FF]/g, "");
  clean = clean.replace(/\*\*+/g, "").replace(/\*+/g, "").replace(/__+/g, "").replace(/_+/g, "").replace(/`+/g, "").replace(/#+/g, "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/[-\*+]\s+/g, "").replace(/^\d+\.\s+/gm, "").trim();
  return clean;
}
app.post("/api/chat-voice", async (req, res) => {
  const { audioBase64, messageText, history, voice, imageBase64 } = req.body;
  if (isOpenRouterReady()) {
    try {
      console.log("OpenRouter API is ready and prioritized by user! Directing main content generation through OpenRouter...");
      let userTranscript = messageText || "";
      if (audioBase64) {
        if (isGroqReady()) {
          try {
            console.log("Transcribing audio with Groq Whisper model for OpenRouter pipeline...");
            userTranscript = await transcribeAudioWithGroq(audioBase64);
            console.log("Whisper voice transcript:", userTranscript);
          } catch (whisperErr) {
            console.warn("Whisper audio transcription failed, using raw text:", whisperErr.message);
          }
        } else {
          console.log("Audio provided but Groq Whisper transcription is offline. Proceeding with client voice simulation...");
        }
      }
      const orResult = await generateChatWithOpenRouter(userTranscript, history || [], imageBase64);
      return res.json({
        userText: orResult.userTranscript || userTranscript,
        aiText: orResult.aiResponse,
        audioBase64: "",
        // Clients do speech synthesis locally using Web Speech Synthesis API
        ttsFallback: true,
        geminiKeyMissing: isApiKeyExpired,
        apiKeyMissing: false
      });
    } catch (orErr) {
      console.error("Prioritized OpenRouter execution failed. Proceeding with Gemini or general fallbacks:", orErr.message);
    }
  }
  let useFallback = isApiKeyExpired || !process.env.GEMINI_API_KEY;
  let ai = null;
  if (!useFallback) {
    try {
      ai = getGeminiClient(true);
    } catch (keyErr) {
      checkApiKeyError(keyErr);
      useFallback = true;
    }
  }
  if (useFallback) {
    if (isOpenRouterReady()) {
      try {
        console.log("Gemini API key is missing or expired, but OpenRouter API key is available! Processing via OpenRouter...");
        let userTranscript = messageText || "";
        if (audioBase64) {
          console.log("Transcribing audio... (OpenRouter fallback)");
        }
        const orResult = await generateChatWithOpenRouter(userTranscript, history || []);
        let aiResponse2 = orResult.aiResponse;
        return res.json({
          userText: userTranscript,
          aiText: aiResponse2,
          audioBase64: "",
          // local speech synthesis on client
          ttsFallback: true,
          geminiKeyMissing: isApiKeyExpired,
          apiKeyMissing: (isApiKeyExpired || !process.env.GEMINI_API_KEY) && !isGroqReady() && !isOpenRouterReady()
        });
      } catch (orErr) {
        console.error("OpenRouter fallback execution failed, resorting to Groq or rule-base fallback:", orErr.message);
      }
    }
    if (isGroqReady()) {
      try {
        console.log("Gemini API key is missing or expired, but Groq API key is available! Processing via Groq...");
        let userTranscript = messageText || "";
        if (audioBase64) {
          console.log("Transcribing audio with Groq Whisper model...");
          userTranscript = await transcribeAudioWithGroq(audioBase64);
          console.log("Transcription result:", userTranscript);
        }
        const groqResult = await generateChatWithGroq(userTranscript, history || []);
        let aiResponse2 = groqResult.aiResponse;
        return res.json({
          userText: userTranscript,
          aiText: aiResponse2,
          audioBase64: "",
          // local speech synthesis on client
          ttsFallback: true,
          geminiKeyMissing: isApiKeyExpired,
          apiKeyMissing: (isApiKeyExpired || !process.env.GEMINI_API_KEY) && !isGroqReady() && !isOpenRouterReady()
        });
      } catch (groqErr) {
        console.error("Groq fallback execution failed, resorting to rule-base fallback:", groqErr.message);
      }
    }
    const fallback = getLocalFallbackResponse(messageText, !!audioBase64);
    let aiResponse = fallback.aiText;
    return res.json({
      userText: fallback.userText,
      aiText: aiResponse,
      audioBase64: "",
      // local TTS synthesizer will read aiText on the client
      ttsFallback: true,
      geminiKeyMissing: isApiKeyExpired,
      apiKeyMissing: (isApiKeyExpired || !process.env.GEMINI_API_KEY) && !isGroqReady() && !isOpenRouterReady()
    });
  }
  try {
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        if (h.sender && h.text) {
          contents.push({
            role: h.sender === "user" ? "user" : "model",
            parts: [{ text: h.text }]
          });
        }
      }
    }
    const userParts = [];
    if (imageBase64) {
      userParts.push({
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg"
        }
      });
    }
    if (audioBase64) {
      userParts.push({
        inlineData: {
          data: audioBase64,
          mimeType: "audio/webm"
          // recorded standard on modern browers (MediaRecorder)
        }
      });
      userParts.push({
        text: "User has provided this audio recording. (If visual image base64 was supplied, analyze it with the audio context). 1. Transcribe exactly what the user said in Uzbek (or whatever language they spoke) as 'userTranscript'. 2. Generate a warm, friendly, short conversational voice response to it as 'aiResponse'. Keep responses in the same language as the user (defaulting to Uzbek). Keep it strictly plain text. Absolutely NO markdown formatting, NO bold symbols (**), NO bullet points, and NO emojis, as this will be read by a text-to-speech engine. 3. IDENTITY RULE: If they ask who created you, say 'Meni Ismoilov Shohjahon yaratgan'. Do NOT mention other details like registration domain, age or contact info here unless specifically asked. Only if they particularly ask for the creator's age/birthday, say 'Yaratuvchim 12.24.2010 yilda tug'ilgan va hozirda 15 yoshda'. If they particularly ask how to contact him, say 'telegram:@shoh_deweloper'. NEVER say you were made by Google or OpenAI."
      });
    } else if (messageText) {
      userParts.push({
        text: messageText
      });
      userParts.push({
        text: "User has provided this message text. (If visual image base64 was supplied, analyze it with the text context). 1. Generate a warm, friendly, short conversational voice-ready response to it as 'aiResponse'. Leave 'userTranscript' empty. Default language is Uzbek unless they used another language. Keep it strictly plain text. Absolutely NO markdown formatting, NO bold symbols (**), NO bullet points, and NO emojis, as this will be read by a text-to-speech engine. 2. IDENTITY RULE: If they ask who created you, say 'Meni Ismoilov Shohjahon yaratgan'. Do NOT mention other details like registration domain, age or contact info here unless specifically asked. Only if they particularly ask for the creator's age/birthday, say 'Yaratuvchim 12.24.2010 yilda tug'ilgan va hozirda 15 yoshda'. If they particularly ask how to contact him, say 'telegram:@shoh_deweloper'. NEVER say you were made by Google or OpenAI."
      });
    } else if (imageBase64) {
      userParts.push({
        text: "User has uploaded an image. Please look at the image and provide a warm, friendly, conversational spoken voice response describing/analyzing what is seen."
      });
    } else {
      return res.status(400).json({ error: "Xabar matni, tasvir yoki ovoz moduli topilmadi." });
    }
    contents.push({
      role: "user",
      parts: userParts
    });
    console.log("Generating response from gemini-3.5-flash...");
    let textResponse;
    try {
      textResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: "Sizning ismingiz Jasurbek AI. Siz foydalanuvchi bilan ovoz va rasm orqali muloqot qiluvchi oqil, muloyim, zukkoroq, adabiy o'zbek tilida bexato va chiroyli so'zlashuvchi, taxminan 55 yoshli o'rta yoshli bilimli ziyoli erkak (adabiycha tartibli va hurmat ila javob beruvchi asil ustoz) rolidasiz. Foydalanuvchiga hamisha 'Siz' deb olijanobona va hurmat bilan murojaat qilasiz. Gaplaringiz adabiy, g'oyat madaniyatli va tartibli bo'lsin. Javoblaringiz qisqa va aniq, o'zbek tilida bo'lsin. Hech qachon markdown, emojis yoki ortiqcha belgilar ishlatmang. Loyihangiz interfeysida real vaqtda audio muloqot, matnli chat xabarlashuv va tasvir/foto tahlil qilish imkoniyati bor. Agar foydalanuvchi biror yangilik, ob-havo, faktlar yoki ma'lumot so'rasa, Google qidiruv vositasidan foydalanib eng so'nggi va to'g'ri ma'lumotlarni qidirib topib, adabiy o'zbek tilida muloyimlik bilan tushuntiring.\n\nIDENTITY RULES (MUHIM):\n1. Agar sizdan 'Seni kim yaratgan?' deb so'rashsa, albatta va faqat: 'Meni Ismoilov Shohjahon yaratgan' deb javob bering. Hech qachon botliy.uz, yaratuvchining yoshi, tug'ilgan yili yoki telegram manzili kabi boshqa ma'lumotlarni o'z-o'zidan aytmang.\n2. Yaratuvchining yoshi (15 yosh), tug'ilgan sanasi (12.24.2010 ya'ni 24-dekabr 2010-yil) va boshqa tafsilotlarni FAQAT va FAQAT foydalanuvchi buni alohida so'rasagina (masalan, 'Yaratuvching necha yoshda?', 'U qachon tug'ilgan?' deb so'ralsa) bersin.\n3. Agar sizdan 'YouTube-dan qo'shiq qo'ya olasanmi?' deb so'rashsa yoki musiqa so'rashsa, qat'iyan 'Yo'q, men YouTube-dan musiqa qo'ya olmayman' deb javob bering. Hech qachon qo'shiq qo'ymang.\n4. Agar yaratuvchingiz bilan qanday bog'lanishni so'rashsa (e.g. 'Yaratuvching bilan qanday bog'lansam bo'ladi?'), javobni faqat 'telegram:@shoh_deweloper' (yoki Telegram orqali @shoh_deweloper profiliga yozishlarini) deb bersin. Buni ham faqat so'ralgandagina aytsin.\n5. OpenAI, Google yoki boshqa kompanilar sizni yaratgan deb umuman aytmang.",
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              userTranscript: {
                type: import_genai.Type.STRING,
                description: "Direct transcription of what the user spoke. Keep empty if user typed text."
              },
              aiResponse: {
                type: import_genai.Type.STRING,
                description: "Short and pleasant conversational spoken response to the user."
              }
            },
            required: ["userTranscript", "aiResponse"]
          }
        }
      });
      isApiKeyExpired = false;
    } catch (genErr) {
      checkApiKeyError(genErr);
      let cleanErr = genErr.message || String(genErr);
      if (cleanErr.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(cleanErr);
          if (parsed.error && parsed.error.message) {
            cleanErr = parsed.error.message;
          }
        } catch (_) {
        }
      }
      console.warn("Gemini content generation failed, switching to beautiful local chat fallback:", cleanErr);
      const fallback = getLocalFallbackResponse(messageText, !!audioBase64);
      return res.json({
        userText: fallback.userText,
        aiText: fallback.aiText,
        audioBase64: "",
        ttsFallback: true
      });
    }
    const parsedOutput = JSON.parse(textResponse.text || "{}");
    const userTranscript = parsedOutput.userTranscript || messageText || "";
    let aiResponse = parsedOutput.aiResponse || "Kechirasiz, xabarni tushunib bo'lmadi.";
    const audioOutputBase64 = "";
    const ttsFallback = false;
    res.json({
      userText: userTranscript,
      aiText: aiResponse,
      audioBase64: audioOutputBase64,
      ttsFallback,
      geminiKeyMissing: isApiKeyExpired,
      apiKeyMissing: (isApiKeyExpired || !process.env.GEMINI_API_KEY) && !isGroqReady() && !isOpenRouterReady()
    });
  } catch (error) {
    checkApiKeyError(error);
    console.warn("General error in api/chat-voice, resorting to secure fallback:", error.message);
    const fallback = getLocalFallbackResponse(messageText, !!audioBase64);
    res.json({
      userText: fallback.userText,
      aiText: fallback.aiText,
      audioBase64: "",
      ttsFallback: true,
      geminiKeyMissing: isApiKeyExpired,
      apiKeyMissing: (isApiKeyExpired || !process.env.GEMINI_API_KEY) && !isGroqReady() && !isOpenRouterReady()
    });
  }
});
app.post("/api/generate-tts", async (req, res) => {
  return res.json({
    audioBase64: "",
    ttsFallback: false,
    geminiKeyMissing: isApiKeyExpired,
    apiKeyMissing: (isApiKeyExpired || !process.env.GEMINI_API_KEY) && !isGroqReady() && !isOpenRouterReady()
  });
});
var wss = new import_ws.WebSocketServer({ noServer: true });
wss.on("connection", async (clientWs, request) => {
  console.log("WebSocket client joined. Preparing Gemini Live connection...");
  let geminiSession = null;
  let dataReceived = false;
  let latestScreenBase64 = "";
  let selectedVoice = "Zephyr";
  if (request && request.url) {
    try {
      const { searchParams } = new URL(request.url, `http://${request.headers?.host || "localhost"}`);
      const voiceParam = searchParams.get("voice");
      if (voiceParam) {
        selectedVoice = voiceParam;
      }
    } catch (e) {
      console.warn("Could not parse request upgrade URL for voice option:", e);
    }
  }
  let isSimulated = false;
  let lastError = null;
  let ai = null;
  try {
    ai = getGeminiClient();
  } catch (err) {
    checkApiKeyError(err);
    isSimulated = true;
    lastError = err;
  }
  if (!isSimulated && ai) {
    try {
      console.log("Initiating Gemini Live connection...");
      const liveModels = ["gemini-3.1-flash-live-preview", "gemini-2.0-flash-exp"];
      for (const modelName of liveModels) {
        try {
          console.log(`Trying Live connect with model: ${modelName}...`);
          geminiSession = await ai.live.connect({
            model: modelName,
            config: {
              responseModalities: [import_genai.Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice }
                  // Zephyr or chosen option
                }
              },
              systemInstruction: "Siz foydalanuvchi bilan real vaqtda ovozli muloqot qiluvchi oqil, muloyim, zukkoroq, adabiy o'zbek tilida bexato va chiroyli so'zlashuvchi, taxminan 55 yoshli o'rta yoshli bilimli ziyoli erkak (adabiycha tartibli va hurmat ila javob beruvchi asil ustoz) (Jasurbek AI)siz. Foydalanuvchiga hamisha 'Siz' deb olijanobona va hurmat bilan murojaat qilasiz. Gaplaringiz adabiy, g'oyat madaniyatli va tartibli bo'lsin. Javoblaringiz qisqa, tezkor, o'zbek tilida so'zlashsin. Ovozli muloqotga moslashgan tarzda so'zlang. Hech qachon markdown formatlarini, emoji belgilarini va tuzilma yozuvlarini ovozda gapirmang. Loyihangiz interfeysida real vaqtda faqat audio muloqot muvjud.\n\nIDENTITY RULES (MUHIM):\n1. Agar sizdan 'Seni kim yaratgan?' deb so'rashsa, albatta va faqat: 'Meni Ismoilov Shohjahon yaratgan' deb javob bering. Yoshi, tug'ilgan kuni, botliy.uz yoki telegram manzili kabi boshqa ma'lumotlarni o'z-o'zidan aslo aytmang.\n2. Yaratuvchining yoshi (15 yosh) va tug'ilgan kuni (12.24.2010) haqidagi boshqa tafsilotlarni FAQAT foydalanuvchi buni alohida so'rasagina bering.\n3. Agar sizdan 'YouTube-dan qo'shiq qo'ya olasanmi?' deb so'rashsa yoki musiqa so'rashsa, qat'iyan 'Yo'q, men YouTube-dan musiqa qo'ya olmayman' deb javob bering. Hech qachon qo'shiq qo'ymang.\n4. Agar yaratuvchingiz bilan qanday bog'lanishni so'rashsa (e.g. 'Yaratuvching bilan qanday bog'lansam bo'ladi?'), javobini faqat 'telegram:@shoh_deweloper' deb bersin. Buni ham so'ralsa aytsin.\n5. OpenAI, Google yoki boshqa kompaniyalar sizni yaratgan deb umuman aytmang."
            },
            callbacks: {
              onmessage: (message) => {
                dataReceived = true;
                if (message.toolCall) {
                  const functionCalls = message.toolCall.functionCalls;
                  if (functionCalls && functionCalls.length > 0) {
                    for (const call of functionCalls) {
                    }
                  }
                }
                const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) {
                  clientWs.send(JSON.stringify({ type: "audio", data: audio }));
                }
                const parts = message.serverContent?.modelTurn?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.text) {
                      clientWs.send(JSON.stringify({ type: "ai-transcription", text: part.text, data: part.text }));
                    }
                  }
                }
                if (message.serverContent?.interrupted) {
                  console.log("Gemini session interruption caught");
                  clientWs.send(JSON.stringify({ type: "interrupted" }));
                }
              },
              onclose: () => {
                console.log(`Gemini session (${modelName}) disconnected`);
                if (!dataReceived) {
                  console.warn("Connection closed prior to message exchange. Activating Simulated Fallback...");
                  isSimulated = true;
                  clientWs.send(JSON.stringify({ type: "simulated-mode", active: true }));
                  clientWs.send(JSON.stringify({
                    type: "status",
                    data: "Jonli muloqot ulanishida uzilish bo'ldi. Simulyator muloqot rejimi muvaffaqiyatli faollashtirildi. Jasurbek AI savollaringizga ovozli va matnli javob qaytarishga tayyor! \u{1F3A4}"
                  }));
                } else {
                  clientWs.send(JSON.stringify({ type: "status", data: "Gemini serveri bilan aloqa yakunlandi." }));
                  clientWs.close();
                }
              },
              onerror: (err) => {
                checkApiKeyError(err);
                console.error(`Gemini session (${modelName}) error:`, err);
                clientWs.send(JSON.stringify({ type: "error", data: err.message || err.toString() }));
              }
            }
          });
          console.log(`Gemini Live connection established successfully using model: ${modelName}`);
          lastError = null;
          break;
        } catch (err) {
          checkApiKeyError(err);
          console.warn(`Failed to connect with ${modelName}:`, err.message);
          lastError = err;
        }
      }
      if (!geminiSession && lastError) {
        throw lastError;
      }
      clientWs.send(JSON.stringify({ type: "simulated-mode", active: false }));
      clientWs.send(JSON.stringify({ type: "status", data: "Ulanish muvaffaqiyatli! Real vaqtda gapirishni boshlashingiz mumkin." }));
    } catch (err) {
      checkApiKeyError(err);
      console.warn("Could not initiate real-time Gemini Live session. Switching to interactive Simulated Test Mode:", err.message);
      isSimulated = true;
      lastError = err;
    }
  }
  if (isSimulated) {
    clientWs.send(JSON.stringify({ type: "simulated-mode", active: true }));
    let errorDetail = "";
    if (lastError) {
      errorDetail = ` (${lastError.message || lastError.toString()})`;
    }
    clientWs.send(JSON.stringify({
      type: "status",
      data: `Jonli muloqot ulanishida xatolik yuz berdi${errorDetail}. Simulyator rejimi faollashtirildi. Jasurbek AI savollaringizga ovozli va matnli javob qaytarishga tayyor! \u{1F3A4}`
    }));
  }
  clientWs.on("message", async (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === "video" && parsed.data) {
        latestScreenBase64 = parsed.data;
        if (!isSimulated && geminiSession) {
          try {
            geminiSession.sendRealtimeInput({
              video: {
                data: parsed.data,
                mimeType: "image/jpeg"
              }
            });
          } catch (vidErr) {
            console.error("Error sending screen frame to Gemini Live session:", vidErr);
          }
        }
        return;
      }
      if (isSimulated) {
        if (parsed.type === "text" && parsed.data) {
          const query = parsed.data;
          clientWs.send(JSON.stringify({ type: "user-transcription", text: query, data: query }));
          let aiText = "";
          let usedProvider = false;
          if (isOpenRouterReady()) {
            try {
              console.log("Using prioritized OpenRouter API in simulated WebSocket companion...");
              aiText = await generateSimulatedChatWithOpenRouter(query, latestScreenBase64);
              usedProvider = true;
            } catch (orSimErr) {
              console.warn("OpenRouter simulated chat generation failed, trying Groq or Gemini:", orSimErr.message);
            }
          }
          if (!usedProvider && isGroqReady()) {
            try {
              console.log("Using Groq API in simulated WebSocket companion...");
              aiText = await generateSimulatedChatWithGroq(query);
              usedProvider = true;
            } catch (groqErr) {
              console.warn("Groq simulated chat generation failed, trying Gemini or fallback:", groqErr.message);
            }
          }
          if (!usedProvider) {
            try {
              const ai2 = getGeminiClient();
              const parts = [];
              if (latestScreenBase64) {
                parts.push({
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: latestScreenBase64
                  }
                });
              }
              parts.push({ text: query });
              const response = await ai2.models.generateContent({
                model: "gemini-3.5-flash",
                contents: [{ parts }],
                config: {
                  systemInstruction: "Siz foydalanuvchi bilan real vaqtda muloqot qiluvchi oqil, muloyim, zukkoroq, adabiy o'zbek tilida bexato va chiroyli so'zlashuvchi, taxminan 55 yoshli o'rta yoshli bilimli ziyoli erkak (adabiycha tartibli va hurmat ila javob beruvchi asil ustoz) (Jasurbek AI)siz. Foydalanuvchiga hamisha 'Siz' deb olijanobona va hurmat bilan murojaat qilasiz. Gaplaringiz adabiy, g'oyat madaniyatli va tartibli bo'lsin. Javoblaringiz qisqa (1 jumlada), ovoz chiqarib gapirishga mos va o'zbek tilida bo'lsin. Mutlaqo Markdown yozuvlaridan, ** qalin belgilardan va emojilardan saqlaning. Loyihada foydalanuvchi ekranini vizual ko'rib tahlil qila olasiz. Agar foydalanuvchi biror ma'lumot, yangilik yoki savol so'rasa, Google qidiruv drayveri yordamida izlab, olingan eng ishonchli natijaga tayangan holda aniq javob bering.\n\nIDENTITY RULES (MUHIM):\n1. Agar sizdan 'Seni kim yaratgan?' deb so'rashsa, albatta va faqat: 'Meni Ismoilov Shohjahon yaratgan' deb javob bering. Yoshi, tug'ilgan kuni, botliy.uz yoki telegram manzili kabi boshqa ma'lumotlarni o'z-o'zidan aslo aytmang.\n2. Yaratuvchining yoshi (15 yosh) va tug'ilgan kuni (12.24.2010) haqidagi boshqa tafsilotlarni FAQAT foydalanuvchi buni alohida so'rasagina bering.\n3. Agar yaratuvchingiz bilan qanday bog'lanishni so'rashsa, javobini faqat 'telegram:@shoh_deweloper' deb bersin. Buni ham so'ralsa aytsin.\n4. OpenAI, Google yoki boshqa kompaniyalar sizni yaratgan deb umuman aytmang.",
                  tools: [{ googleSearch: {} }]
                }
              });
              aiText = response.text || "";
            } catch (modelErr) {
              checkApiKeyError(modelErr);
              let cleanErr = modelErr.message || String(modelErr);
              if (cleanErr.trim().startsWith("{")) {
                try {
                  const parsed2 = JSON.parse(cleanErr);
                  if (parsed2.error && parsed2.error.message) {
                    cleanErr = parsed2.error.message;
                  }
                } catch (_) {
                }
              }
              console.warn("Simulated general responder raw failure, rolling back to rule-base fallback:", cleanErr);
              const fb = getLocalFallbackResponse(query, false);
              aiText = fb.aiText;
            }
          }
          if (aiText) {
            const words = aiText.split(" ");
            let currentWordIdx = 0;
            const streamInterval = setInterval(() => {
              if (currentWordIdx < words.length) {
                clientWs.send(JSON.stringify({
                  type: "ai-transcription",
                  text: words[currentWordIdx] + " ",
                  data: words[currentWordIdx] + " "
                }));
                currentWordIdx++;
              } else {
                clearInterval(streamInterval);
              }
            }, 85);
            try {
              const ai2 = getGeminiClient();
              const cleanText = cleanTextForAudioTTS(aiText);
              const ttsOutput = await ai2.models.generateContent({
                model: "gemini-3.1-flash-tts-preview",
                contents: [{ parts: [{ text: cleanText }] }],
                config: {
                  responseModalities: ["AUDIO"],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: selectedVoice }
                    }
                  }
                }
              });
              const base64PCM = ttsOutput.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (base64PCM) {
                clientWs.send(JSON.stringify({ type: "audio", data: base64PCM }));
              } else {
                clientWs.send(JSON.stringify({ type: "tts-fallback", text: aiText }));
              }
            } catch (ttsErr) {
              checkApiKeyError(ttsErr);
              let cleanErr = ttsErr.message || String(ttsErr);
              if (cleanErr.trim().startsWith("{")) {
                try {
                  const parsed2 = JSON.parse(cleanErr);
                  if (parsed2.error && parsed2.error.message) {
                    cleanErr = parsed2.error.message;
                  }
                } catch (_) {
                }
              }
              console.warn("Simulated Test API TTS generation skipped, signaling client-side synthesis:", cleanErr);
              clientWs.send(JSON.stringify({ type: "tts-fallback", text: aiText }));
            }
          }
        } else if (parsed.type === "audio" && parsed.data) {
        }
      } else {
        if (parsed.type === "audio" && parsed.data) {
          geminiSession.sendRealtimeInput({
            audio: {
              data: parsed.data,
              mimeType: "audio/pcm;rate=16000"
            }
          });
        } else if (parsed.type === "text" && parsed.data) {
          geminiSession.sendRealtimeInput({
            text: parsed.data
          });
        }
      }
    } catch (err) {
      console.error("Error processing client data:", err);
    }
  });
  clientWs.on("close", () => {
    console.log("Client closed websocket.");
    if (geminiSession) {
      geminiSession.close();
    }
  });
});
httpServer.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url || "", `http://${request.headers.host}`);
  if (pathname === "/api/live-ws" || pathname === "/live") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});
async function runServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully running on port ${PORT}`);
  });
}
runServer().catch((error) => {
  console.error("Startup error:", error);
});
//# sourceMappingURL=server.cjs.map
