เริ่มพัฒนาโปรเจคใน workspace `AIChatbot-Gemini` โดยทำเฉพาะหน้า Sign-in ตามรูป 1 ที่แนบมา

**เป้าหมาย: สร้างหน้าเว็บให้ตรงกับรูปต้นฉบับแบบ pixel-perfect ห้าม redesign หรือเปลี่ยนรายละเอียดตามความชอบของคุณ**

### 1. เริ่มต้นโปรเจค

- ตรวจสอบไฟล์ใน workspace ก่อน ถ้ายังไม่มีโปรเจค ให้สร้าง React + TypeScript ด้วย Vite ในโฟลเดอร์ปัจจุบัน ไม่สร้างโฟลเดอร์โปรเจคซ้อน
- ใช้ npm และ TypeScript strict mode
- ติดตั้ง Tailwind CSS ด้วย `tailwindcss` และ `@tailwindcss/vite`
- เพิ่ม Tailwind plugin ใน `vite.config.ts` โดยคง React plugin ไว้ด้วย
- ใช้ `@import "tailwindcss";` ใน stylesheet หลัก
- ลบหน้าตัวอย่างและ styles เริ่มต้นของ Vite ที่รบกวน layout เช่น root max-width, padding และ text-align
- ทำให้เปิดหน้า Sign-in ได้ทั้ง `/` และ `/login`

### 2. กฎการใช้ภาพอ้างอิง

รูป 1 คือแหล่งอ้างอิงหลักสำหรับหน้าตาเว็บ ส่วนรูป 2 เป็นภาพ workspace ใน VS Code ไม่ใช่ UI ที่ต้องสร้าง

- เปิดและตรวจรูป 1 ก่อนเขียน UI
- ภาพอ้างอิงมีขนาด 1536 × 1024 ให้ใช้ viewport ขนาดนี้เป็นหลักในการเทียบ
- ยึด layout, ตำแหน่ง, สัดส่วน, สี, typography, line breaks, spacing, border, radius, shadow และรูปทรงตกแต่งตามภาพ
- ห้ามเพิ่ม ลด เปลี่ยนข้อความ หรือจัดวางองค์ประกอบใหม่
- ห้ามใช้ template หรือ component library ที่ทำให้หน้าตาเปลี่ยน
- สร้าง UI จริงด้วย React และ Tailwind ห้ามนำ screenshot ทั้งภาพมาแสดงแทนหน้าเว็บ
- ใช้ SVG หรือ assets สำหรับโลโก้และรูปทรงที่ต้องการความแม่นยำ ห้ามใช้ emoji แทนไอคอน
- หากรายละเอียดในคำอธิบายด้านล่างต่างจากภาพ ให้ยึดภาพเป็นหลัก

### 3. รายละเอียดหน้า Sign-in

**ฝั่งซ้าย**

- พื้นหลังสีเขียว sage อ่อน พร้อมรูปทรงโปร่งแสงซ้อนกันตามภาพ
- พื้นที่ฝั่งซ้ายกว้างประมาณ 56.25% ของ viewport ที่ขนาดอ้างอิง
- มุมบนซ้ายมีโลโก้สี่เหลี่ยมมนสีเขียวเข้ม ภายในเป็นประกายสีขาว และข้อความ `AI Chat`
- หัวข้อใหญ่หนา ต้องแบ่งเป็นสองบรรทัดตามนี้:
  - `A little clarity.`
  - `One conversation away.`
- ข้อความรอง: `Think, write, and explore with AI.`
- ด้านล่างเป็นการ์ดตัวอย่างบทสนทนาสีขาวมุมมน พร้อม bubble, avatar, โลโก้ และจุดสามจุดตามภาพ
- ข้อความในการ์ดต้องตรงตามนี้:
  - `Help me turn an idea into a plan.`
  - `Let’s start with your goal.`
  - `What do you want to achieve? A clear goal will help us break your idea into simple, actionable steps.`
- จัดการขึ้นบรรทัดของข้อความให้ตรงกับภาพที่ viewport อ้างอิง

**ฝั่งขวา**

- พื้นหลังสีขาว
- จัดกลุ่ม Sign-in ให้อยู่ในตำแหน่งเดียวกับภาพ ไม่ย้ายไปเป็นการ์ดมีกรอบ
- โลโก้ประกายสีขาวบนสี่เหลี่ยมมนสีเขียวเข้ม
- หัวข้อ: `Welcome to AI Chat`
- ข้อความรอง: `Sign in to start a conversation.`
- ปุ่มสีขาว ขอบบาง มุมมน พร้อมโลโก้ Google สีมาตรฐาน และข้อความ `Continue with Google`
- ข้อความใต้ปุ่ม: `New here? Your account is created when you sign in.`
- รักษาระยะห่าง ความกว้างปุ่ม และการจัดกึ่งกลางตามภาพ
- ห้ามเพิ่มช่อง email/password, Register, Forgot Password หรือปุ่มอื่น

### 4. ขอบเขตงานรอบนี้

- ทำเฉพาะ Sign-in UI ยังไม่สร้าง Chat, Settings, dialogs หรือ modals
- ยังไม่เชื่อม Firebase Authentication, Gemini API หรือ Backend
- เตรียม handler `onGoogleSignIn` สำหรับเชื่อมต่อภายหลัง โดยไม่จำลองว่า login สำเร็จ ไม่ redirect และไม่เปิด alert
- การ์ดบทสนทนาฝั่งซ้ายเป็นภาพประกอบแบบ static
- แยก components ให้เหมาะสม เช่น `SignInPage`, `BrandLogo`, `ConversationPreview` และ `GoogleSignInButton`
- ใช้ Tailwind เป็นหลัก อนุญาต custom CSS เฉพาะรายละเอียดที่จำเป็นต่อความเหมือน
- Desktop ต้องตรงต้นฉบับ ส่วนจอเล็กให้ปรับ responsive โดยคงองค์ประกอบและลำดับเนื้อหา ไม่มีข้อความล้นหรือ horizontal scroll

### 5. ตรวจสอบก่อนส่งงาน

- รัน build, TypeScript checks และ lint ที่โปรเจคมี แล้วแก้ข้อผิดพลาด
- เปิดเว็บและ capture screenshot ที่ viewport 1536 × 1024 หากมี browser automation ให้ใช้ตรวจด้วย
- เทียบ screenshot กับรูป 1 แบบ side-by-side หรือ overlay แล้วแก้จุดคลาดเคลื่อน โดยเฉพาะ:
  - สัดส่วนสองฝั่ง
  - ตำแหน่งและการขึ้นบรรทัดของหัวข้อ
  - ฟอนต์ ขนาด น้ำหนัก และ line-height
  - การ์ดตัวอย่างบทสนทนา
  - รูปทรงพื้นหลังและโลโก้
  - ตำแหน่งกลุ่ม Sign-in และปุ่ม Google
- ห้ามสรุปว่า “ตรงเป๊ะ” หากยังไม่ได้ตรวจภาพที่ render จริง
- หากไม่มีเครื่องมือ capture screenshot ให้แจ้งตรง ๆ ว่ายังไม่ได้ตรวจความเหมือนด้วยภาพ
- เมื่อเสร็จ ให้สรุปสิ่งที่สร้าง ผลการตรวจสอบ และคำสั่งรันพร้อม local URL

ลงมือสร้างไฟล์และติดตั้ง dependencies ได้เลย ไม่ต้องหยุดแค่เสนอแผน หากไม่สามารถเปิดรูปอ้างอิงได้ ให้แจ้งก่อนสร้าง UI แทนการเดาหน้าตาเอง