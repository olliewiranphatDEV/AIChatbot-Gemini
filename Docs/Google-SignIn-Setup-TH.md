# Google Sign-in และ Guest — AIChatbot-Gemini

## Overview (What to do)

เพิ่มวิธีเข้าใช้งาน 2 แบบ โดยใช้ Firebase Authentication สำหรับ Google sign-in และใช้ state ในหน่วยความจำสำหรับ Guest

| วิธีเข้าใช้งาน | พฤติกรรม |
| --- | --- |
| Continue with Google | เปิดหน้าต่างเลือกบัญชี Google ผ่าน Firebase SDK แล้วเข้า `/chat` เมื่อยืนยันสำเร็จ แสดงชื่อและอีเมลจริงใน Settings |
| Guest | เข้า `/chat` ได้ทันที ไม่ต้องมี Firebase configuration ไม่สร้างบัญชี anonymous และไม่บันทึกประวัติแชท |

Guest เก็บเฉพาะข้อความของแชทที่เปิดอยู่ในหน่วยความจำ เพื่อแสดงบทสนทนาระหว่างใช้งาน เมื่อกด New chat, Exit guest หรือ reload ข้อความนั้นจะหาย ไม่มีรายการ history ใน Sidebar

Google ใช้การคงสถานะ auth ของ Firebase SDK เมื่อ reload จึงกลับมาใช้งานด้วยบัญชีเดิมได้จนกว่าจะ Log out ทั้งนี้ข้อความแชทของบัญชี Google ยังอยู่ในหน่วยความจำระหว่าง session เท่านั้น รอบนี้ไม่ได้เพิ่มฐานข้อมูลประวัติแชทหรือ Gemini API

กระบวนการเลือกบัญชีใช้ `GoogleAuthProvider` และ `signInWithPopup` ตาม [Firebase Google sign-in documentation](https://firebase.google.com/docs/auth/web/google-signin) การคงสถานะบัญชีใช้ persistence เริ่มต้นของ SDK ตาม [Authentication State Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)

## Configuration Preparation

### เริ่มจากยังไม่มี Firebase project

1. เปิด [Firebase Console](https://console.firebase.google.com/) แล้วล็อกอินด้วย Google account ที่จะใช้ดูแลโปรเจค
2. กดปุ่มสร้าง project ใหม่ เช่น Create a project หรือ Add project
3. ตั้งชื่อ `AIChatbot-Gemini` ตรวจ Project ID ที่ Firebase สร้างให้ แล้วกด Continue หากมีเงื่อนไขให้ตรวจและยอมรับด้วยตัวเองก่อนดำเนินการ
4. หากมีตัวเลือก Gemini in Firebase หรือ Google Analytics สามารถปิดหรือข้ามได้ เพราะไม่ได้เป็นข้อกำหนดของ Google sign-in รอบนี้
5. กด Create project รอจนสร้างเสร็จ แล้วเปิดหน้า Project overview
6. กดไอคอน Web `</>` หากมีแอปใน project อยู่แล้ว ให้กด Add app แล้วเลือก Web
7. ตั้ง App nickname เช่น `AIChatbot-Gemini Web` แล้วกด Register app ขั้นตอนนี้ยังไม่ต้องตั้งค่า Hosting
8. ในหน้า SDK setup ดู `firebaseConfig` แล้วคัดลอกค่า `apiKey`, `authDomain`, `projectId`, `appId` ไม่ต้องคัดลอกโค้ด initialize ไปวางซ้ำในโปรเจค เพราะเชื่อม SDK ไว้แล้ว
9. หากปิดหน้า SDK setup ไปแล้ว ให้เปิด Project settings → General → Your apps → เลือก Web app ที่เพิ่งสร้าง → SDK setup and configuration แล้วดู config อีกครั้ง
10. เปิดเมนู Build → Authentication แล้วกด Get started หาก project ยังไม่เคยเปิด Authentication
11. เปิด Sign-in method → Google เปิด Enable เลือกอีเมลสำหรับติดต่อผู้ใช้ แล้วกด Save
12. เปิด Authentication → Settings → Authorized domains กด Add domain แล้วเพิ่ม `localhost` และ `127.0.0.1` โดยไม่ใส่ `http://`, port หรือ path หากมีค่าอยู่แล้วไม่ต้องเพิ่มซ้ำ
13. กลับ VS Code ที่ root ของ `AIChatbot-Gemini` สร้างไฟล์ `.env` โดยใช้ตัวอย่างด้านล่าง ตรวจว่าชื่อไฟล์คือ `.env` ไม่ใช่ `.env.txt` หากมี `.env` อยู่แล้ว ให้เพิ่มเฉพาะค่า auth โดยรักษาค่าเดิม
14. ใส่ค่า 4 รายการจากขั้นตอนที่ 8 ตามตารางและตัวอย่างด้านล่าง โดยใช้ค่าจาก Web app เดียวกัน และปล่อย `VITE_FIREBASE_AUTH_EMULATOR_URL` ว่าง
15. Save ไฟล์ หยุด dev server เดิมด้วย Ctrl+C แล้วเริ่ม `npm.cmd run dev` ใหม่ เปิด `http://localhost:5173/` และทดสอบตาม Steps/Procedures ด้านล่าง

ขั้นตอนสร้าง project และลงทะเบียน Web app อ้างอิง [Firebase Web setup](https://firebase.google.com/docs/web/setup) ส่วนการเปิด Google provider อ้างอิง [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)

ต้องใช้ค่า 4 รายการนี้จาก Web app เดียวกัน:

| Environment variable | ค่าใน `firebaseConfig` |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

### Authorized domains

เมื่อ deploy ให้เพิ่ม hostname ที่ใช้จริงใน Authorized domains เพิ่มเติมจากค่าที่ใช้ทดสอบในเครื่อง

Firebase project ที่สร้างหลังวันที่ 28 เมษายน 2025 ไม่ได้เพิ่ม `localhost` ให้อัตโนมัติ จึงต้องตรวจรายการนี้ก่อนทดสอบ อ้างอิง [Firebase Authentication troubleshooting](https://firebase.google.com/docs/auth/faq-and-troubleshooting)

### ตัวอย่าง `.env`

ใส่ค่าจริงจาก Firebase Console แทนข้อความตัวอย่างทุกช่อง โปรเจครองรับทั้ง `.env` และ `.env.local` หากมีค่าชื่อเดียวกันทั้งสองไฟล์ `.env.local` จะมีลำดับสูงกว่า จึงควรเก็บ configuration ชุดนี้ไว้ในไฟล์เดียว

```dotenv
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_APP_ID=YOUR_FIREBASE_WEB_APP_ID
VITE_FIREBASE_AUTH_EMULATOR_URL=
```

ปล่อย `VITE_FIREBASE_AUTH_EMULATOR_URL` ว่างเมื่อทดสอบ Google จริง ค่า Firebase Web config เป็น client configuration; ไม่ใส่ service-account JSON, private key, Google OAuth client secret หรือ Gemini API key ในไฟล์นี้ ค่า `VITE_*` ถูกเปิดเผยใน browser bundle ตาม [Vite environment variables](https://vite.dev/guide/env-and-mode) ส่วนบทบาทของ Firebase API key อธิบายไว้ใน [Firebase API keys](https://firebase.google.com/docs/projects/api-keys)

โปรเจค ignore ไฟล์ `.env*` ทั้งหมด รวมถึง `.env.example` และไม่ commit ไฟล์เหล่านี้ ใช้ตัวอย่างในเอกสารนี้เพื่อสร้างไฟล์ในเครื่อง หลังแก้ env ต้อง restart Vite และเมื่อ deploy ต้องกำหนด env ก่อน build เนื่องจาก Vite อ่านค่าตอนเริ่ม server/build

## Steps/Procedures

### 1. ติดตั้ง dependencies และตรวจ build

ใช้ Node 22 ตาม environment ของโปรเจค Firebase SDK ถูกล็อกเป็น `12.7.0` ซึ่งรองรับ Node ตั้งแต่ 20 ขึ้นไป และติดตั้งไว้ใน `package.json` แล้ว

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run lint
```

### 2. เปิดเว็บ

หลังกรอก `.env` และตั้งค่า Console ครบแล้ว ให้หยุด dev server เดิมและเริ่มใหม่:

```powershell
npm.cmd run dev
```

เปิด `http://localhost:5173/` หาก Vite เลือก port อื่น ให้ใช้ URL ที่แสดงใน terminal

### 3. ตรวจ Google sign-in

1. กด Continue with Google
2. ตรวจว่ามี popup สำหรับเลือกบัญชี Google และปุ่มทั้งสองไม่รับการกดซ้ำระหว่างรอ
3. เลือกบัญชีและยืนยันในหน้าต่างของ Google
4. เมื่อสำเร็จ เว็บเปิด `/chat` พร้อมแชทว่าง
5. เปิด Settings และตรวจชื่อ, อีเมล และ Google account badge
6. กลับ Chat พิมพ์ข้อความ แล้วเข้า Settings และ Back to chat ข้อความและ draft ต้องยังอยู่
7. Reload: บัญชี Google ต้องยังล็อกอิน ข้อความใน session ก่อน reload จะไม่ถูกเรียกคืน เพราะยังไม่มีระบบบันทึกประวัติ
8. กด Log out ใน Settings แล้วตรวจว่ากลับหน้า Sign-in และเปิด `/chat` โดยตรงไม่ได้จนกว่าจะ sign-in หรือเลือก Guest อีกครั้ง

การ Log out ทำผ่าน `signOut` ของ Firebase สำเร็จก่อนกลับสู่สถานะ signed-out หากเกิดข้อผิดพลาด เว็บแสดงข้อความและยังไม่อ้างว่าออกจากระบบแล้ว

### 4. ตรวจ Guest

1. กด Guest แล้วตรวจว่าเข้า `/chat` ได้ แม้ไม่ได้กรอก Firebase configuration
2. ชื่อใน Sidebar ต้องเป็น Guest และไม่มีรายการ Today/Yesterday หรือประวัติจากบัญชีอื่น
3. พิมพ์ข้อความ เปิด Settings แล้ว Back to chat ข้อความปัจจุบันต้องยังอยู่
4. กด New chat ข้อความและ draft เดิมต้องถูกทิ้ง ไม่มี history ให้ย้อนกลับไปเลือก
5. Settings ต้องแสดง Guest session พร้อมข้อความ Chat history is not saved.
6. กด Exit guest หรือ reload แล้วตรวจว่ากลับหน้า Sign-in เมื่อเข้า Guest ใหม่ต้องเริ่มว่าง

Guest ไม่เรียก `signInAnonymously` และไม่เขียนข้อความลง localStorage, sessionStorage, IndexedDB หรือฐานข้อมูล

### 5. รันทดสอบอัตโนมัติด้วย Auth Emulator

Auth Emulator ใช้ project จำลอง `demo-ai-chatbot` เพื่อทดสอบ Google popup, session และ logout โดยไม่ต้องมีบัญชี Google จริง อ้างอิง [Firebase Authentication Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth) การทดสอบนี้ไม่ยืนยันว่า Google provider และ Authorized domains ของ project จริงถูกตั้งค่าครบแล้ว

ต้องติดตั้ง Google Chrome บนเครื่อง เครื่องมือทดสอบใช้ Chrome แบบ headless

Terminal แรก:

```powershell
npm.cmd run emulators:auth
```

รอจน Auth Emulator พร้อมที่ `127.0.0.1:9099` จากนั้น Terminal ที่สอง:

```powershell
npm.cmd run test:e2e
```

Tests เปิด Vite แยกที่ port `5180` สำหรับกรณีไม่มี configuration และ `5181` สำหรับ emulator โดยไม่ใช้ค่า auth จริงจาก `.env` หรือ `.env.local` หาก port เหล่านี้ถูกใช้อยู่ ให้หยุด test server เดิมก่อน หลังทดสอบให้หยุด emulator ด้วย Ctrl+C

### 6. จุดที่ใช้ดูโค้ดหรือเชื่อมต่อเพิ่มเติม

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/auth/firebase.ts` | อ่าน configuration, สร้าง Auth client, Google popup, logout และข้อความข้อผิดพลาด |
| `src/auth/useAuthSession.ts` | ติดตาม auth state, ป้องกันกดซ้ำ, แยก Guest/Google และจัดการ session |
| `src/App.tsx` | ควบคุม route และแยก workspace ตาม identity เพื่อไม่ปนข้อมูลระหว่าง session |
| `src/pages/signin/SignInPage.tsx` | ปุ่ม Google และ Guest พร้อมสถานะกำลังทำงานและข้อความผิดพลาด |
| `src/pages/chat/ChatPage.tsx` | แชทในหน่วยความจำ และการทิ้งข้อความเก่าของ Guest เมื่อ New chat |
| `src/pages/settings/SettingsPage.tsx` | ข้อมูล Google จริง หรือ Guest session และการออกจาก session |

### Troubleshooting

| อาการ | สิ่งที่ต้องตรวจ |
| --- | --- |
| Google sign-in is currently unavailable | ค่า env ทั้ง 4 รายการ, restart Vite, เปิด Google provider และ Authorized domains |
| Popup ถูกบล็อก | อนุญาต pop-ups สำหรับ hostname ที่เปิดเว็บ แล้วกดปุ่มอีกครั้ง |
| ปิดหน้าต่างก่อนเลือกบัญชี | เว็บยังอยู่หน้า Sign-in ให้กดใหม่หรือเข้า Guest |
| Network error | ตรวจอินเทอร์เน็ตหรือ Auth Emulator หากใช้โหมดทดสอบ |
| ข้อความหลัง reload หาย | พฤติกรรมปัจจุบัน: มี auth persistence สำหรับ Google แต่ยังไม่มี chat-history persistence |

หลังตั้งค่า project จริงครบแล้ว ให้ตรวจตามขั้นตอน Google sign-in ข้างต้นด้วยบัญชีของคุณ การทดสอบด้วย emulator ใช้บัญชีจำลองเท่านั้น
