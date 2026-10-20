พัฒนา **หน้า Chat** ต่อในโปรเจค `AIChatbot-Gemini` ที่มีอยู่แล้ว โดยยึดภาพอ้างอิงหน้า Chat ที่แนบมาแบบ pixel-perfect

**ห้าม redesign ห้ามเปลี่ยน layout สี ข้อความ หรือองค์ประกอบตามความชอบของคุณ และต้องจัด responsive ให้ครบเหมือนที่ทำไว้ในหน้า Sign-in**

### 1. ตรวจโปรเจคเดิมก่อนลงมือ

โปรเจคใช้ React + TypeScript + Vite + Tailwind CSS และติดตั้ง Google Sans ไว้แล้ว

สถานะล่าสุด:
- `043dac3` — make sign-in page responsive for desktop, mobile and large screens
- `38fea85` — install Google Sans font package and use it site-wide
- `d978d40` — add sign-in page

อ่าน components, styles, routing และวิธีจัด responsive ของหน้า Sign-in ก่อนเริ่มงาน โดยเฉพาะการปรับ spacing, typography และ layout สำหรับ desktop, mobile และ large screens

- เพิ่มหน้า Chat ในโปรเจคเดิม ไม่ initialize โปรเจคใหม่
- ใช้ Google Sans ที่ติดตั้งไว้แล้ว ไม่เปลี่ยนฟอนต์ทั้งเว็บ
- ใช้ Tailwind และ reuse โลโก้ สี และ components เดิมที่เหมาะสม
- รักษาหน้า Sign-in และ responsive เดิมให้ทำงานเหมือนก่อน
- เปิดหน้า Chat ได้ที่ `/chat` เพื่อทดสอบโดยตรง ยังไม่ต้องเชื่อม authentication

### 2. ภาพอ้างอิงเป็นหลัก

- เปิดดูภาพหน้า Chat ก่อนเขียน UI
- ใช้ viewport **1536 × 1024** เป็นขนาดหลักสำหรับเทียบภาพ
- ยึดสัดส่วน ตำแหน่ง สี typography, spacing, line breaks, border, radius, shadow และไอคอนตามภาพ
- ถ้าคำอธิบายด้านล่างต่างจากภาพ ให้ยึดภาพเป็นหลัก ยกเว้นฟอนต์ให้ใช้ Google Sans ตามโปรเจคเดิม
- สร้าง React UI จริง ห้ามใช้ screenshot ทั้งภาพแทนหน้าเว็บ
- ห้ามเพิ่ม model selector, upload, microphone หรือฟีเจอร์ที่ไม่ปรากฏในภาพ
- ห้ามนำภาพ Sign-in มาใช้เป็น layout ของ Chat

### 3. สร้างองค์ประกอบตามภาพให้ครบ

**Sidebar ฝั่งซ้าย**

- พื้นหลังสีอ่อน มีเส้นแบ่งกับพื้นที่ Chat
- ที่ viewport อ้างอิง Sidebar กว้างประมาณ 384px หรือ 25% ของภาพ ให้ตรวจสัดส่วนจากภาพจริง
- ด้านบนมีโลโก้และข้อความ `AI Chat`
- ปุ่มสีเขียวเข้มพร้อมไอคอนบวกและข้อความ `New chat`
- กลุ่ม `Today`:
  - `From idea to first version` — selected พร้อมพื้นหลังเขียวอ่อนและเส้นสีเขียวด้านซ้าย
  - `Writing a clearer message`
- กลุ่ม `Yesterday`:
  - `Learning something new`
  - `Weekend ideas`
- แต่ละรายการมีไอคอนบทสนทนาและปุ่มจุดสามจุดตามภาพ
- ด้านล่างมีเส้นแบ่ง, avatar ตัว `O`, ชื่อ `Ollie` และไอคอนเฟืองพร้อมข้อความ `Settings`
- ส่วนบัญชีอยู่ด้านล่าง ส่วนรายการแชทเลื่อนได้เมื่อยาว

**Chat header**

- หัวข้อ `From idea to first version`
- ปุ่มจุดสามจุดด้านขวา
- เส้นขอบล่างและระยะห่างตามภาพ

**พื้นที่สนทนา**

แสดง mock conversation เริ่มต้นให้ตรงภาพ:

1. User bubble ชิดขวา พื้นหลังเขียวอ่อน:
   `I have an app idea. How can I turn it into a small first version?`

   ข้อความเวลา: `You · 2:14 PM`

2. Assistant ชิดซ้าย มีโลโก้และชื่อ `AI Chat` พร้อมการ์ดคำตอบ:

   `Start with one clear problem and the smallest useful solution.`

   รายการ:
   1. `Define the user and their main goal.`
   2. `Choose one essential action.`
   3. `Build a simple flow and test it.`

   ข้อความท้าย:
   `What should someone be able to do in your first version?`

3. User bubble ชิดขวา:
   `Let’s map the pages first.`

   ข้อความเวลา: `You · 2:16 PM`

4. Assistant reply ที่แสดงสถานะกำลังตอบ:
   `Absolutely. We can start with three core screens`

   มี cursor สีเขียวท้ายข้อความและข้อความรอง:
   `Generating response...`

รักษาตำแหน่ง ความกว้าง bubble, padding, ระยะระหว่างข้อความ และการขึ้นบรรทัดตามภาพ

**Composer ด้านล่าง**

- กล่องสีขาว ขอบบาง มุมมน พร้อม shadow ตามภาพ
- ช่องพิมพ์ placeholder: `Message AI Chat...`
- ขณะ generating แสดงปุ่มสีเขียวเข้มพร้อมไอคอนสี่เหลี่ยมสีขาวและข้อความ `Stop`
- ข้อความใต้ composer:
  `AI can make mistakes. Check important information.`
- Composer อยู่ด้านล่างของพื้นที่ Chat เสมอ โดยไม่ทับข้อความล่าสุด

### 4. Responsive ต้องทำในรอบนี้

**ต้องจัด responsive ให้ครบเหมือนหน้า Sign-in ไม่ใช่ทำเฉพาะ desktop แล้วค่อยแก้ทีหลัง**

ใช้แนวทางและ breakpoints เดิมเมื่อเหมาะสม แต่ปรับตามลักษณะของหน้า Chat:

- **Desktop:** layout และสัดส่วนตรงภาพอ้างอิง
- **Large screens:** ปรับพื้นที่อย่างสมดุล จำกัดความกว้างข้อความเพื่อให้อ่านง่าย ไม่ขยายทุกองค์ประกอบตาม viewport จนใหญ่เกินไป
- **Tablet:** ปรับ Sidebar, padding และพื้นที่ข้อความให้พอดี โดยไม่เบียด composer
- **Mobile:** พื้นที่ Chat เต็มความกว้าง ย้าย Sidebar เป็น drawer ที่เปิดด้วยปุ่ม menu ใน header และปิดได้หลังเลือกแชท
- Sidebar drawer ต้องใช้สีและองค์ประกอบเดิม ไม่ออกแบบธีมใหม่
- Header, composer และปุ่มต่าง ๆ ต้องยังเข้าถึงได้
- ใช้ความสูง viewport ที่รองรับ mobile browser เช่น `100dvh`
- จัด flex/grid ให้พื้นที่ข้อความ scroll ได้จริง โดยใช้ `min-h-0` และ `min-w-0` ในจุดที่จำเป็น
- ข้อความยาวและ URL ต้องไม่ทำให้ layout ล้น
- ห้ามแก้ปัญหาด้วยการย่อทั้งหน้าให้เป็นภาพเล็ก
- ตรวจอย่างน้อยที่ 390 × 844, 768 × 1024, 1536 × 1024 และ 1920 × 1080
- ตรวจตอนเปิด keyboard บนมือถือหากเครื่องมือรองรับ หากไม่ได้ทดสอบให้แจ้งตามจริง

### 5. ขอบเขตงานและ state

รอบนี้ทำเฉพาะ Frontend UI และ local state:

- ยังไม่เชื่อม Gemini, Backend, Firebase Auth หรือ Firestore
- แยก mock data ออกจาก components เพื่อเปลี่ยนเป็นข้อมูลจริงภายหลัง
- หน้า `/chat` เริ่มต้นด้วย conversation และสถานะ generating ตามภาพ เพื่อให้เทียบดีไซน์ได้
- ปุ่ม Stop เปลี่ยน local state เป็นหยุดตอบ และเปลี่ยน composer กลับเป็นสถานะพร้อมส่ง
- ช่องพิมพ์รับข้อความได้ ส่งด้วย Enter และขึ้นบรรทัดด้วย Shift+Enter โดยไม่ส่งระหว่าง IME composition
- การส่งข้อความเพิ่ม user message ใน local state ได้ แต่ห้ามสร้างคำตอบ AI ปลอมโดยอ้างว่าเรียก API สำเร็จ
- New chat และการเลือก history ใช้ local state ได้
- ยังไม่สร้างหน้า Settings หรือ Rename/Delete dialogs ในรอบนี้
- เตรียม callback สำหรับ Settings และเมนูจุดสามจุดโดยไม่สร้างหน้าหรือ popup เพิ่ม
- แยก components ตามหน้าที่ เช่น `ChatPage`, `ChatSidebar`, `ChatHeader`, `MessageList`, `ChatMessage` และ `ChatComposer`

### 6. ตรวจสอบก่อนส่งงาน

- รัน build, TypeScript checks และ lint ที่มี แล้วแก้ข้อผิดพลาด
- ตรวจหน้า Sign-in เดิมด้วย เพื่อป้องกัน regression จาก shared styles หรือ components
- Capture screenshot หน้า Chat ที่ **1536 × 1024** แล้วเทียบกับภาพต้นฉบับแบบ side-by-side หรือ overlay
- แก้ความคลาดเคลื่อนด้าน Sidebar, header, bubble, composer, สี และ spacing ก่อนส่งงาน
- ตรวจ responsive ตามขนาดที่ระบุ รวมถึง scroll ของข้อความและ Sidebar
- หากมี browser automation ให้ใช้ตรวจภาพและ interaction
- ห้ามสรุปว่า “ตรงเป๊ะ” หรือ “responsive ผ่าน” หากยังไม่ได้ตรวจจริง
- หากเครื่องมือไม่รองรับการตรวจบางอย่าง ให้ระบุสิ่งที่ยังไม่ได้ตรวจอย่างชัดเจน

ลงมือแก้ไฟล์ได้เลย เมื่อเสร็จให้สรุป components ที่เพิ่ม ผลการตรวจสอบ และ local URL สำหรับเปิดหน้า Chat

หากเปิดภาพอ้างอิงหน้า Chat ไม่ได้ ให้แจ้งก่อนสร้าง UI แทนการเดาดีไซน์เอง