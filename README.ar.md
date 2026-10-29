# ChatTransfer

<!-- Project status and community -->
[![CI](https://img.shields.io/github/actions/workflow/status/turboxing/ChatTransfer/ci.yml?branch=main&style=flat-square&logo=githubactions&label=CI)](https://github.com/turboxing/ChatTransfer/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/turboxing/ChatTransfer?style=flat-square&color=fe7d37)](https://github.com/turboxing/ChatTransfer/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/turboxing/ChatTransfer?style=flat-square&color=a4a61d)](https://github.com/turboxing/ChatTransfer/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/turboxing/ChatTransfer?style=flat-square&color=dfb317)](https://github.com/turboxing/ChatTransfer/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/turboxing/ChatTransfer/blob/main/CONTRIBUTING.md)

<!-- npm package -->
[![npm version](https://img.shields.io/npm/v/chattransfer?style=flat-square&logo=npm&color=cb3837)](https://www.npmjs.com/package/chattransfer)
[![npm downloads](https://img.shields.io/npm/dt/chattransfer?style=flat-square&logo=npm&label=npm%20downloads&color=cb3837)](https://www.npmjs.com/package/chattransfer)
[![npm monthly downloads](https://img.shields.io/npm/dm/chattransfer?style=flat-square&logo=npm&label=month%20downloads&color=cb3837)](https://www.npmjs.com/package/chattransfer)
[![npm weekly downloads](https://img.shields.io/npm/dw/chattransfer?style=flat-square&logo=npm&label=weekly%20downloads&color=cb3837)](https://www.npmjs.com/package/chattransfer)
[![npm daily downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.npmjs.org%2Fdownloads%2Fpoint%2Flast-day%2Fchattransfer&query=%24.downloads&style=flat-square&logo=npm&label=daily%20downloads&color=cb3837)](https://www.npmjs.com/package/chattransfer)
[![npm unpacked size](https://img.shields.io/npm/unpacked-size/chattransfer?style=flat-square&logo=npm&color=cb3837)](https://www.npmjs.com/package/chattransfer)

<!-- Distribution and license -->
[![GitHub Downloads](https://img.shields.io/github/downloads/turboxing/ChatTransfer/total?style=flat-square&logo=github&color=44cc11)](https://github.com/turboxing/ChatTransfer/releases)
[![MIT License](https://img.shields.io/github/license/turboxing/ChatTransfer?style=flat-square&color=007ec6)](./LICENSE)

[English](./README.md) | [简体中文](./README.zh-CN.md) | العربية

> أداة بسيطة للدردشة ونقل الملفات عبر الشبكة المحلية، موجهة للمطورين والمختبرين والفرق الصغيرة. امسح رمز QR، افتح المتصفح، وشارك النصوص والصور والملفات فورًا — بدون حسابات أو رفع سحابي أو تطبيقات إضافية.

## عرض توضيحي

- [عرض على YouTube](https://www.youtube.com/watch?v=gZxeBqd7vbY)
- [عرض على Bilibili](https://www.bilibili.com/video/BV13QJp6vE3r/?vd_source=b4939bcf1ffecbca608b946bbdd9c475)

## لماذا ChatTransfer

أنا مهندس اختبار. في عملي اليومي، أنقل باستمرار الأشياء بين الكمبيوتر وهواتف الاختبار: حزم التثبيت ومعاملات الاختبار والروابط تذهب إلى الهاتف، والسجلات ولقطات الشاشة وتسجيلات الشاشة تعود إلى الكمبيوتر. كثيرًا ما يسألني زملائي:

- “كيف أنقل تسجيل الشاشة إلى الكمبيوتر؟”
- “هل يجب أن أجهّز أدوات تطوير لتثبيت حزمة الاختبار على الهاتف؟”
- “هل يمكن تحويل هذه الصورة إلى رابط؟”
- “هل يمكن تحويل هذا الرابط إلى رمز QR؟”

تبدو هذه أمورًا صغيرة، لكنها تستهلك أكبر وقت عندما تكون مطلوبة فورًا. أريد أن يجعل ChatTransfer لحظات “المشاركة السريعة” بسيطة قدر الإمكان.

هذه الاحتياجات دائمًا “مؤقتة”، لكن الحلول المعتادة ثقيلة: تثبيت تطبيق مراسلة، تسجيل الدخول، الرفع إلى منصة خارجية، القلق على الخصوصية بعد المشاركة، إلغاء التثبيت، وإعادة ضبط هواتف الاختبار المستعارة. بعد تكرار هذه الدورة مرات كثيرة، طوّرت ChatTransfer في عطلة الأسبوع: أداة نقل عبر الشبكة المحلية، متعددة المنصات، بدون تثبيت، وتُستخدم ثم تُترك، تجعل المشاركة المؤقتة بين الأجهزة بسيطة وقابلة للتحكم وخفيفة. بعد قرابة 3 سنوات من التطوير، أثبت ChatTransfer فعاليته في العديد من السيناريوهات الواقعية، لذلك قررت مشاركته هنا.

أستخدمه يوميًا وأطوّره باستمرار بناءً على سيناريوهات واقعية. سيبقى مجانيًا. إذا واجهت مشكلة أو لديك فكرة أفضل، افتح Issue في هذا المستودع؛ ملاحظاتك تساعده على التطور.

## الميزات

- **امسح للاتصال** — يتم إنشاء رمز QR عند بدء التشغيل، ويمكنك فتح المحادثة في متصفح الهاتف.
- **دردشة جماعية فورية** — عدة مستخدمين في نفس الغرفة المحلية مع مزامنة فورية.
- **نقل الملفات** — إرسال نصوص وصور وملفات في ثوانٍ.
- **رفع مجمّع** — اسحب وأفلت عدة ملفات دفعة واحدة.
- **تثبيت وإبراز الرسائل** — إبقاء الرسائل المهمة ظاهرة.
- **رمز QR للرسائل** — تحويل أي رسالة إلى رمز QR لسهولة المشاركة.
- **سجل محادثات محلي** — تخزين مؤقت محلي مع إمكانية المسح.
- **متعدد المنصات** — يدعم Windows و macOS.
- **واجهة متعددة اللغات** — الصينية والإنجليزية.

## حالات الاستخدام

- **كمبيوتر ↔ كمبيوتر** — مشاركة السجلات وملفات الإعداد وحزم الاختبار ولقطات الشاشة والروابط.
- **كمبيوتر ↔ هاتف** — إرسال روابط التصحيح ورموز QR ولقطات الشاشة إلى الهاتف، وإعادة الصور والتسجيلات إلى الكمبيوتر.
- **هاتف ↔ هاتف** — مشاركة سريعة داخل فريق صغير دون تثبيت تطبيق مراسلة آخر.
- **عروض مباشرة** — توزيع المواد فورًا أثناء الاجتماعات.

## التحميل والتثبيت

حمّل أحدث ملف تنفيذي من صفحة [الإصدارات](https://github.com/turboxing/ChatTransfer/releases).

### npm

إذا كنت تستخدم Node.js 20.17 أو أحدث، يمكنك تشغيل ChatTransfer مباشرة:

```bash
npx chattransfer
```

أو تثبيته عالميًا:

```bash
npm install -g chattransfer
chattransfer
```

لخادم Linux بدون واجهة رسومية:

```bash
chattransfer --no-browser
```

| النظام | الملف |
|--------|--------|
| macOS | `ChatTransfer-macos-x64-v{version_with_underscores}` |
| Windows | `ChatTransfer-windows-x64-v{version}.exe` |

### Windows

1. حمّل ملف Windows التنفيذي.
2. انقر نقرًا مزدوجًا لتشغيله.
3. إذا ظهرت رسالة أمان، اختر **Run anyway**.

### macOS

1. حمّل ملف macOS التنفيذي وانقله إلى المكان الذي تفضله.
2. إذا ظهرت رسالة “لا يمكن التحقق من المطوّر”، اضغط **Cancel**.
3. افتح **System Settings → Privacy & Security**، اضغط **Allow Anyway**، وأدخل كلمة المرور.
4. افتح التطبيق مرة أخرى واختر **Open**.

بعد بدء التطبيق، يفتح المتصفح تلقائيًا ويعرض رمز QR. امسحه بهاتفك للانضمام إلى المحادثة.

## التشغيل من المصدر

### المتطلبات

- Node.js 20.17+
- npm 9+

### الأوامر

```bash
npm install
cd frontend
npm install
cd ..
npm run dev
```

يعمل التطبيق على `http://localhost:55556`.

لتطوير الواجهة:

```bash
cd frontend
npm run dev
```

### الاختبار والبناء

```bash
npm test
cd frontend
npm run build
```

### التغليف

```bash
sh publish.sh mac
sh publish.sh win
sh publish.sh all
```

تُكتب الملفات المُغلّفة في `dist/`.

## دعم المنصات

- macOS 10.15+
- Windows 10+
- أي متصفح حديث على الكمبيوتر أو الهاتف
- الملفات التنفيذية الجاهزة لا تحتاج إلى Node.js أو تبعيات إضافية

## البنية التقنية

يعتمد ChatTransfer على مجموعة تقنيات خفيفة ومركّزة:

- **الواجهة:** Vue 3 و Vite و Vue Router و Element Plus و Socket.IO Client.
- **الخادم:** Node.js و Express و Socket.IO و `express-fileupload`.
- **التغليف:** `pkg` لإنشاء ملفات تنفيذية مستقلة لـ macOS و Windows.

### هيكل المشروع

```text
ChatTransfer/
├── server/       # Express API وأحداث Socket.IO والخدمات والقياس
├── frontend/     # تطبيق Vue 3
├── tests/        # اختبارات الخادم والمستودع
├── docs/         # أدلة التطوير والإصدار والقياس
├── release/      # وثائق الإصدارات وسجل التغييرات
└── publish.sh    # سكربت التغليف
```

لمزيد من التفاصيل، راجع [ARCHITECTURE.md](./ARCHITECTURE.md).

## الخصوصية والأمان

- يتم حفظ سجل المحادثات والملفات محليًا على جهازك.
- يحدث النقل داخل شبكتك المحلية فقط.
- لا يوجد نظام حسابات ولا تخزين سحابي مدمج.
- القياس معطّل افتراضيًا، ولا تتضمن النسخة مفتوحة المصدر أي مفتاح مزوّد.
- إذا فعّلت القياس، يجب أن تضع مفتاح API الخاص بك في `config/local.json`؛ بدون مفتاح، لا يرسل ChatTransfer أي طلب قياس خارجي.

راجع [docs/telemetry.md](./docs/telemetry.md).

## التطوير

- [دليل التطوير](./docs/development.md)
- [دليل الإصدار](./docs/release.md)
- [دليل المساهمة](./CONTRIBUTING.md)
- [مدونة قواعد السلوك](./CODE_OF_CONDUCT.md)

## الأسئلة الشائعة

**لا تفتح الصفحة بعد مسح رمز QR.**
تأكد من أن هاتفك وكمبيوترك على نفس الشبكة المحلية.

**فشل نقل الملف.**
تحقق من تجاوز الملف للحد المسموح، ثم أعد المحاولة.

**كيف أبدّل اللغة؟**
افتح **الإعدادات** في الزاوية العلوية اليمنى واختر لغتك.

## سجل التغييرات

راجع [release/CHANGELOG.ar.md](./release/CHANGELOG.ar.md).

## الترخيص

[رخصة MIT](./LICENSE)

## المؤلف

Created by suncx.
