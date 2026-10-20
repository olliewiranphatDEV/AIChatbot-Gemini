สร้างหน้า **Settings** เป็นหน้าสุดท้ายของโปรเจค `AIChatbot-Gemini` โดยยึดภาพ `Settings-Page.png` ที่แนบมาแบบ pixel-perfect

**ห้าม redesign ห้ามเปลี่ยนรายละเอียดหรือเพิ่มองค์ประกอบนอกภาพ และต้องทำ responsive ให้ครบเหมือนหน้า Sign-in และ Chat ที่สร้างไว้แล้ว**

### 1. ตรวจโปรเจคเดิมก่อนลงมือ

- อ่านโครงสร้างโปรเจค, routing, components, styles และ responsive ของหน้า Sign-in กับ Chat ก่อน
- พัฒนาต่อในโปรเจค React + TypeScript + Vite + Tailwind CSS เดิม ไม่ initialize ใหม่
- ใช้ Google Sans ที่ติดตั้งไว้แล้ว ไม่เปลี่ยนฟอนต์
- Reuse โลโก้, design tokens, Sidebar และ mobile drawer จากหน้า Chat เมื่อเหมาะสม
- รักษาหน้าตาและพฤติกรรมของ Sign-in กับ Chat เดิม ไม่ให้เกิด regression
- เพิ่ม route `/settings`
- เชื่อมปุ่ม Settings ใน Sidebar ของ Chat ให้เปิดหน้านี้

### 2. กฎการใช้ภาพอ้างอิง

- เปิดดู `Settings-Page.png` ก่อนเขียน UI ภาพนี้คือแหล่งอ้างอิงหลัก
- ภาพอีกไฟล์ที่เป็นหน้าต่าง Codex ไม่ใช่ดีไซน์เว็บ
- ใช้ viewport **1536 × 1024** สำหรับเทียบความเหมือน
- รักษา layout, สี, ตำแหน่ง, สัดส่วน, typography, spacing, border, radius, shadow และไอคอนตามภาพ
- หากคำอธิบายด้านล่างต่างจากภาพ ให้ยึดภาพเป็นหลัก ยกเว้นฟอนต์ให้ใช้ Google Sans ตามโปรเจคเดิม
- สร้าง UI ด้วย React และ Tailwind จริง ห้ามนำ screenshot ทั้งภาพมาแสดงแทนหน้าเว็บ
- ห้ามใช้ emoji แทนไอคอนหรือโลโก้
- ห้ามเพิ่ม header bar, tabs, Save button หรือ controls ที่ไม่มีในภาพ

### 3. องค์ประกอบที่ต้องสร้าง

**Sidebar**

- พื้นหลังสีอ่อนตามภาพ ที่ viewport อ้างอิงกว้างประมาณ 330px
- โลโก้และข้อความ `AI Chat` ด้านบน
- ปุ่มสีเขียวเข้มพร้อมไอคอนบวกและข้อความ `New chat`
- กลุ่ม `Today`:
  - `From idea to first version`
  - `Writing a clearer message`
- กลุ่ม `Yesterday`:
  - `Learning something new`
  - `Weekend ideas`
- รายการมีไอคอนบทสนทนาตามภาพ
- ด้านล่างเป็น avatar สีเขียว ตัว `O` และชื่อ `Ollie`
- แถว `Settings` มีไอคอนเฟืองและพื้นหลังเขียวอ่อนแสดง active state
- ใช้ข้อมูลและ navigation ร่วมกับ Chat ไม่สร้าง history อีกชุดที่แยกจากกัน
- การเข้าหรือออกจาก Settings ต้องไม่ทำให้ conversation เดิมหาย
- รักษาสัดส่วน Sidebar ตามภาพ Settings โดยไม่เปลี่ยนสัดส่วนหน้า Chat เดิมโดยไม่จำเป็น

**พื้นที่หลัก**

- พื้นหลังขาวนวลตามภาพ
- มุมบนขวามีลูกศรซ้ายและข้อความ `Back to chat`
- หัวข้อใหญ่ `Settings`
- ข้อความรอง `Make AI Chat feel like your space.`
- วางเนื้อหาและการ์ดตามตำแหน่งในภาพ ไม่จัดทุกอย่างกึ่งกลางใหม่

**Account**

- หัวข้อ `Account`
- การ์ดสีขาว ขอบบาง มุมมน
- Avatar วงกลมสีเขียวเข้ม ตัว `O`
- ชื่อ `Ollie`
- อีเมลตัวอย่าง `ollie@example.com`
- Badge พร้อมโลโก้ Google และข้อความ `Google account`
- เป็นข้อมูลแบบ read-only ไม่มีปุ่ม Edit หรือช่องแก้ข้อมูล

**Appearance**

- หัวข้อ `Appearance`
- การ์ดสีขาว ขอบบาง มุมมน
- ภายในมีหัวข้อ `Theme` และข้อความ `Choose how AI Chat looks.`
- ตัวเลือกสามใบเรียงแนวนอนบน desktop:
  - `Light`
  - `Dark`
  - `System`
- แต่ละใบมีภาพ preview ขนาดเล็กตามภาพ สร้างด้วย CSS/SVG ได้
- Light preview เป็นหน้าตาสีอ่อน
- Dark preview เป็นหน้าตาสีเข้ม
- System preview แบ่งส่วนสีอ่อนและเข้มด้วยแนวเฉียงตามภาพ
- สถานะเริ่มต้นเลือก `Light` มีขอบสีเขียว พื้นหลังเขียวอ่อน และวงกลมเครื่องหมายถูกมุมบนขวา
- ไม่เพิ่มปุ่ม Save

**Session**

- หัวข้อ `Session`
- การ์ดสีขาว ขอบบาง มุมมน
- ข้อความ `Signed in with Google`
- ข้อความรอง `Log out on this device.`
- ปุ่ม `Log out` ขอบสีแดง ตัวหนังสือสีแดง อยู่ทางขวาตามภาพ

### 4. Responsive ต้องทำให้ครบในรอบนี้

**เน้นย้ำ: ต้องจัด responsive ในระดับเดียวกับหน้า Sign-in และ Chat ไม่ใช่ทำเฉพาะ desktop**

- ศึกษาและใช้แนวทาง responsive เดิมเมื่อเหมาะสม
- Desktop ที่ 1536 × 1024 ต้องตรงภาพอ้างอิง
- Large screens ต้องจำกัดความกว้างเนื้อหาและรักษาระยะห่างอย่างสมดุล ไม่ยืดการ์ดหรือขยายตัวอักษรจนใหญ่เกินไป
- Tablet ปรับ padding และความกว้างการ์ดให้พอดี
- Mobile ใช้ Sidebar drawer และปุ่มเปิดเมนูตามพฤติกรรมของหน้า Chat เดิม
- ตัวเลือก Theme ปรับจำนวนคอลัมน์ตามพื้นที่ หากแคบให้เรียงลงมา ห้ามย่อจนข้อความหรือ preview อ่านไม่ออก
- Account card ต้องรองรับชื่อและอีเมลยาวโดยไม่ล้น
- Session card ปรับให้ปุ่ม Log out ลงบรรทัดใหม่ได้เมื่อพื้นที่ไม่พอ
- เนื้อหาหลักเลื่อนแนวตั้งได้และเข้าถึงการ์ดสุดท้ายได้ครบ
- ใช้ `min-width: 0` และการตัดหรือขึ้นบรรทัดข้อความในจุดที่จำเป็น
- ไม่มี horizontal scroll หรือองค์ประกอบทับกัน
- ห้ามทำ responsive ด้วยการย่อทั้งหน้า
- ตรวจอย่างน้อยที่ 390 × 844, 768 × 1024, 1536 × 1024 และ 1920 × 1080

### 5. Interaction และขอบเขต

รอบนี้ทำหน้า Settings UI และ navigation โดยยังไม่เพิ่ม Backend, Gemini API หรือ Firebase integration

- `Back to chat` กลับไป conversation ที่เปิดอยู่ก่อนเข้า Settings หากไม่มีให้กลับ `/chat`
- การเลือก history และ New chat ใช้พฤติกรรมเดิมของหน้า Chat
- Theme controls ใช้งานผ่าน keyboard ได้ มี selected state และ accessible labels
- หากมีระบบ theme อยู่แล้ว ให้เชื่อมกับระบบเดิม
- หากยังไม่มีระบบ theme ให้ทำ local selection state และเตรียม `onThemeChange` สำหรับเชื่อมต่อภายหลัง ยังไม่ออกแบบธีมใหม่ให้ทุกหน้าในรอบนี้
- การตรวจเทียบภาพต้องใช้ Light theme
- หากมี authentication และ logout จริงอยู่แล้ว ให้เชื่อมผ่าน handler เดิม
- หากยังไม่มี ให้เตรียม `onLogout` callback โดยไม่อ้างว่า logout สำเร็จ ไม่เปิด alert และไม่ล้างประวัติแชท
- ยังไม่เพิ่ม dialogs/modals หรือฟีเจอร์นอกภาพ

### 6. ตรวจสอบก่อนส่งงาน

- รัน build, TypeScript checks และ lint ที่โปรเจคมี แล้วแก้ข้อผิดพลาด
- ตรวจ navigation ระหว่าง Chat และ Settings รวมถึงการคง conversation เดิม
- ตรวจ responsive ทุกขนาดที่ระบุ
- ตรวจ Sign-in และ Chat เดิมหลังแก้ shared components หรือ styles
- หากมี browser automation ให้ capture screenshot ที่ 1536 × 1024 แล้วเทียบกับ `Settings-Page.png` แบบ side-by-side หรือ overlay
- แก้ความคลาดเคลื่อนของ layout, typography, spacing, Sidebar, cards และ Theme previews ก่อนส่งงาน
- ห้ามรายงานว่า “ตรงเป๊ะ” หรือ “ตรวจผ่าน” หากยังไม่ได้ตรวจจริง
- หากเครื่องมือไม่รองรับการตรวจบางอย่าง ให้ระบุสิ่งที่ยังไม่ได้ตรวจ

ลงมือแก้ไฟล์ได้เลย ไม่หยุดแค่เสนอแผน เมื่อเสร็จให้สรุปสิ่งที่สร้าง ผลการตรวจสอบ และ local URL สำหรับเปิดหน้า Settings

หากเปิดภาพอ้างอิงไม่ได้ ให้แจ้งก่อนสร้าง UI แทนการเดาดีไซน์เอง