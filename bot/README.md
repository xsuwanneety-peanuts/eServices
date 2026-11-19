# น้องบอท JMI E-Service สำหรับ Microsoft Teams

บอทใน Teams ที่ตอบคำถามจาก Knowledge Base ของ JMI E-Service แบบเดียวกับหน้า **Knowledge › Assistance**
ทำงานบน **Cloudflare Workers แผนฟรี** (ไม่ต้องผูกบัตร) และเรียก **Gemini API แบบ free tier**

```
คนใน Teams พิมพ์  @น้องบอท ลาป่วยต้องทำยังไง
        │  (Teams Outgoing Webhook, ลงลายเซ็น HMAC)
        ▼
Cloudflare Worker  ── ตรวจลายเซ็น
   (bot/src)        ── อ่านบทความ "ทุกหน่วยงาน" จาก Firestore (ล็อกอินด้วยบัญชีบอท)
                    ── ถาม Gemini ด้วยคำสั่งชุดเดียวกับหน้า Assistance
                    ── ตอบกลับเข้า channel
```

## บอทตอบจากอะไร
- บทความใน Knowledge Base ที่ตั้งเป็น **ทุกหน่วยงาน** และบทความที่มากับระบบ
- **ไม่ใช้บทความ "เฉพาะหน่วยงาน"** เพราะ Outgoing Webhook ไม่ได้บอกว่าใครถาม ข้อมูลเฉพาะหน่วยงานจึงไม่หลุดเข้า channel
- ใช้ได้ใน channel ของทีมที่สร้าง webhook และต้อง @mention บอท

## สิ่งที่ต้องเตรียม (ครั้งเดียว)

### 1. Gemini API key (ฟรี ไม่ต้องผูกบัตร)
1. เปิด <https://aistudio.google.com/apikey> ด้วยบัญชี Google ของบริษัท
2. กด **Create API key** เลือกโปรเจกต์ **E-Service-UAT**
3. คัดลอก key ไว้ใช้ในข้อ 5 (อย่าใส่ใน repo หรือส่งในแชท)

### 2. บัญชีบอทใน Firebase (ใช้อ่าน Knowledge Base)
1. Firebase Console > โปรเจกต์ **e-service-uat-e8402** > Authentication > Users > **Add user**
2. อีเมล เช่น `teams-bot@jmi.local` และตั้งรหัสผ่านยาวๆ
3. ไม่ต้องเพิ่มใน Employee Directory บัญชีนี้อ่านได้เฉพาะบทความ "ทุกหน่วยงาน" ตามกฎ Firestore

### 3. Deploy Worker ขึ้น Cloudflare
```bash
cd bot
npm install
npx wrangler login      # เปิดเบราว์เซอร์ให้ล็อกอิน / สมัคร Cloudflare (ฟรี)
npx wrangler deploy
```
จะได้ URL เช่น `https://jmi-eservice-bot.<ชื่อบัญชี>.workers.dev` เปิดดูแล้วต้องขึ้น `{"ok":true,...}`

### 4. สร้าง Outgoing Webhook ใน Teams
1. ในทีมที่ต้องการ กด **⋯ > Manage team > Apps** แล้วเลือก **Create an outgoing webhook** (มุมขวาล่าง)
2. Name: `น้องบอท`
3. Callback URL: `https://jmi-eservice-bot.<ชื่อบัญชี>.workers.dev/teams`
4. Description: `ถามเรื่องระเบียบและขั้นตอนจาก Knowledge Base ของ JMI E-Service`
5. Profile picture: ใช้รูป `src/assets/assistant-avatar.png`
6. กด **Create** แล้วคัดลอก **Security token** ที่ขึ้นมา (แสดงครั้งเดียว)

ถ้าไม่มีปุ่มนี้ แปลว่าผู้ดูแล Teams ของบริษัทปิด Outgoing Webhook ไว้ ต้องขอให้เปิดก่อน

### 5. ใส่ความลับให้ Worker
รันทีละคำสั่ง แล้ววางค่าเมื่อระบบถาม (ค่าไม่แสดงบนหน้าจอและไม่เก็บใน repo)
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put TEAMS_HMAC_SECRET
npx wrangler secret put BOT_EMAIL
npx wrangler secret put BOT_PASSWORD
```

### 6. Workflow สำหรับส่งคำตอบที่ช้า (แนะนำ)
Teams รอคำตอบจาก webhook ได้แค่ 5 วินาที แต่ Gemini แบบฟรีบางครั้งใช้นานกว่านั้น ถ้าตั้ง Workflow ไว้ บอทจะตอบก่อนว่า "รับคำถามแล้ว" แล้วส่งคำตอบจริงตามมาเป็นข้อความใหม่ใน channel
1. ใน channel เดียวกับที่ใช้บอท กด **⋯** ข้างชื่อ channel > **Workflows**
2. เลือกแม่แบบ **Post to a channel when a webhook request is received**
3. ตั้งชื่อ เช่น `น้องใจ - ส่งคำตอบ` กด Next แล้วเลือกทีมและ channel เดิม กด **Add workflow**
4. คัดลอก URL ที่ได้ (URL นี้ใครมีก็โพสต์เข้า channel ได้ ให้เก็บเป็นความลับ)
5. ใส่ให้ Worker:
   ```bash
   npx.cmd wrangler secret put TEAMS_WORKFLOW_URL
   ```
ถ้าไม่ตั้ง บอทจะพยายามตอบภายใน 5 วินาที และถ้าไม่ทันจะขอให้ถามใหม่

### 7. ทดสอบ
ใน channel พิมพ์ `@น้องบอท ลาป่วยต้องแนบใบรับรองแพทย์ไหม`
ดู log ได้ด้วย `npm run tail` (ในโฟลเดอร์ `bot`)

## API สำหรับเครื่องมืออื่น (ไม่บังคับ)
ถ้าตั้ง secret `API_TOKEN` จะเปิดใช้ `POST /ask` สำหรับระบบอื่น เช่น Power Automate
```bash
npx wrangler secret put API_TOKEN
```
```bash
curl -X POST https://jmi-eservice-bot.<ชื่อบัญชี>.workers.dev/ask -H "Authorization: Bearer <API_TOKEN>" -H "Content-Type: application/json" -d "{\"question\":\"ลาป่วยต้องทำอย่างไร\"}"
```
ตอบกลับเป็น `{"answer":"..."}`

## ข้อควรรู้
- **โควตาฟรี:** Cloudflare Workers วันละ 100,000 ครั้ง ส่วน Gemini free tier จำกัดจำนวนครั้งต่อนาทีและต่อวัน ถ้าเกิน บอทจะบอกให้ลองใหม่
- **5 วินาที:** Teams รอคำตอบไม่เกิน 5 วินาที บอทจะตอบภายใน 4.5 วินาที ถ้าช้ากว่านั้นจะขอให้ถามใหม่ ครั้งแรกหลัง deploy อาจช้ากว่าปกติ
- **ข้อมูลกับ Gemini แบบฟรี:** ตามเงื่อนไขของ Google ข้อมูลที่ส่งเข้า free tier อาจถูกนำไปใช้ปรับปรุงบริการ อย่าใส่ข้อมูลลับในบทความ "ทุกหน่วยงาน" (ใช้กับหน้า Assistance เช่นกัน)
- **App Check:** ตอนนี้ Firestore ยังไม่บังคับ App Check บอทจึงอ่านได้ ถ้าวันหนึ่งเปิดบังคับ App Check ของ Firestore บอทจะอ่านบทความไม่ได้
- **เปลี่ยนรหัสบัญชีบอท:** ต้อง `npx wrangler secret put BOT_PASSWORD` ใหม่ด้วย
- โค้ดคำสั่งของ AI ใช้ร่วมกับหน้า Assistance ที่ `src/utils/assistantPrompt.ts` แก้ที่เดียว ได้ผลทั้งสองที่
