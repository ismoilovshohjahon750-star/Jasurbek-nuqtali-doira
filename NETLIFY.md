# Jarvis AI Assistant — Netlify orqali Host qilish va Haqiqiy Serverga joylash Qo'llanmasi

Ushbu qo'llanma orqali siz **Jarvis AI Assistant** ilovasini Netlify-ga qanday yuklash hamda real vaqtda ovozli ssenariylar (`server.ts` va `WebSockets`) ishlashi uchun zarur bo'lgan konfiguratsiyani amalga oshirasiz.

---

## ⚠️ Muhim tushuncha (Arxitektura qoidasi!)

Sizning loyihangiz **Full-Stack (Frontend + Backend + WebSockets)** hisoblanadi.
- **Frontend (Tashqi interfeys):** React + Vite. Buni **Netlify** kabi statik hostinglarda juda oson host qilsa bo'ladi.
- **Backend (O`rta tizim):** Express hamda WebSockets (`ws`). Netlify serverless platforma bo'lganligi sababli, u uzoq vaqt davomida uzluksiz ishlovchi WebSockets drayverini qo'llab-quvvatlay olmaydi.

**Eng optimal yechim (Split-architecture):**
1. **Backend (Server)** qismini **Render.com**, **Railway.app** yoki **Koyeb.com** (bepul Node.js hostinglar) platformalarining biriga yuklang.
2. **Frontend (Interfeys)** qismini esa **Netlify** platformasiga yuklang va u orqali yuqoridagi backend serveriga ulaning.

---

## 1-QADAM: Backend Serverni sozlash (Render yoki Railway yordamida)

Sizga qulay bo'lishi uchun **Render.com** misolida ko'rsatamiz:

1. **Render.com** saytida ro'yxatdan o'ting va **New +** tugmasini bosib **Web Service** ni tanlang.
2. Github repository-gingizni Render-ga bog'lang.
3. Quyidagi sozlamalarni kiriting:
   - **Language:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start` (yoki `node dist/server.cjs`)
4. **Environment Variables (Atrof-muhit o'zgaruvchilari):**
   Render-dagi "Environment" bo'limiga quyidagi kalitlarni kiriting:
   ```env
   GEMINI_API_KEY=sizning_gemini_api_kalitingiz
   GROQ_API_KEY=sizning_groq_api_kalitingiz
   OPENROUTER_API_KEY=sizning_openrouter_api_kalitingiz
   NODE_ENV=production
   ```
5. Deploy qiling va Render sizga taqdim etgan URL manzilni nusxalab oling (Masalan: `https://jarvis-backend.onrender.com`).

---

## 2-QADAM: Frontend-ni Netlify-ga joylash

Vite React frontendini bevosita Netlify orqali integratsiya qilish:

1. **Netlify.com** paneliga kiring va **Add new site** -> **Import from Git** yoki o'z papkangizni shunchaki drag-and-drop qiling.
2. Agar Git orqali ulagan bo'lsangiz, quyidagi sozlamalarni tanlang (ular biz yaratgan `netlify.toml` fayli tufayli avtomatik ham sozlanadi):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. **Environment Variables (Atrof-muhit o'zgaruvchilari):**
   Netlify "Site configuration" -> "Environment variables" bo'limiga quyidagi kalitni kiriting:
   - Kalit: `VITE_BACKEND_URL`
   - Qiymat: `https://jarvis-backend.onrender.com` (1-qadamda Render-dan nusxalangan link)
   
*(Ushbu o'zgaruvchi orqali Netlify-dagi frontend loyiha WebSockets orqali Render-da joylashgan tizimga to'g'ridan-to'g'ri bog'lanadi).*

4. **Deploy** buyrug'ini bosing. Loyihangiz bir necha soniyada muvaffaqiyatli ishga tushadi!

---

## 💡 Alternativ oson usul: Butun tizimni bitta joyda (Render yoki Railway-da) host qilish

Agar loyihani ikkiga ajratmasdan, ham backend ham frontendni bitta URL orqali butunlay bitta serverda ishlatishni xohlasangiz:
- Shunchaki butun loyihani **Render.com (Web Service)** yoki **Railway.app** drayverlarida to'liq build qiling.
- Bu ssenariyda, biz yozgan kod o'zi turgan portni (`3000`) avtomatik aniqlaydi va biror qo'shimcha `VITE_BACKEND_URL` kiritishingiz deyarli shart bo'lmaydi!
