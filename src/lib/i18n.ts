// Internationalization data for canadial.com.
// Pure data + helpers — safe to import from client or server components.

export const SLOGANS = [
  "Protecting Canadians, one call at a time",
  "Know before you answer",
  "Your safety net against phone scams",
  "Real Canadians protecting real Canadians",
  "Don't let fear answer the phone",
  "New to Canada? We've got your back",
  "Scammers target newcomers. We protect them",
  "Your first line of defence in a new country",
  "CRA will never call to threaten you. We'll tell you who really called",
  "No matter where you're from, you deserve to feel safe",
];

export type LocaleMeta = {
  code: string; // route segment / content key
  path: string; // URL path
  hreflang: string; // hreflang code
  flag: string;
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
  htmlLang: string;
};

export const LOCALES: LocaleMeta[] = [
  { code: "en", path: "/", hreflang: "en", flag: "🇨🇦", nativeName: "English", englishName: "English", dir: "ltr", htmlLang: "en-CA" },
  { code: "zh", path: "/zh", hreflang: "zh-Hans", flag: "🇨🇳", nativeName: "中文", englishName: "Simplified Chinese", dir: "ltr", htmlLang: "zh-Hans" },
  { code: "zh-tw", path: "/zh-tw", hreflang: "zh-Hant", flag: "🇹🇼", nativeName: "繁體", englishName: "Traditional Chinese", dir: "ltr", htmlLang: "zh-Hant" },
  { code: "pa", path: "/pa", hreflang: "pa", flag: "🇮🇳", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi", dir: "ltr", htmlLang: "pa" },
  { code: "tl", path: "/tl", hreflang: "tl", flag: "🇵🇭", nativeName: "Filipino", englishName: "Filipino", dir: "ltr", htmlLang: "tl" },
  { code: "ar", path: "/ar", hreflang: "ar", flag: "🇸🇦", nativeName: "عربي", englishName: "Arabic", dir: "rtl", htmlLang: "ar" },
  { code: "hi", path: "/hi", hreflang: "hi", flag: "🇮🇳", nativeName: "हिंदी", englishName: "Hindi", dir: "ltr", htmlLang: "hi" },
  { code: "fr", path: "/fr", hreflang: "fr", flag: "🇫🇷", nativeName: "Français", englishName: "French", dir: "ltr", htmlLang: "fr" },
  { code: "es", path: "/es", hreflang: "es", flag: "🇪🇸", nativeName: "Español", englishName: "Spanish", dir: "ltr", htmlLang: "es" },
  { code: "ko", path: "/ko", hreflang: "ko", flag: "🇰🇷", nativeName: "한국어", englishName: "Korean", dir: "ltr", htmlLang: "ko" },
  { code: "vi", path: "/vi", hreflang: "vi", flag: "🇻🇳", nativeName: "Tiếng Việt", englishName: "Vietnamese", dir: "ltr", htmlLang: "vi" },
];

export function getLocale(code: string): LocaleMeta | undefined {
  return LOCALES.find((l) => l.code === code);
}

// hreflang -> path map for metadata.alternates.languages.
// Relative paths resolve against metadataBase (set in the root layout).
export const HREFLANG_ALTERNATES: Record<string, string> = {
  ...Object.fromEntries(LOCALES.map((l) => [l.hreflang, l.path])),
  "x-default": "/",
};

export type LangContent = {
  heading: string;
  intro: string;
  description: string;
  searchButton: string;
  scamTitle: string;
  scamBody: string;
  rightsTitle: string;
  rights: string[];
  backToEnglish: string;
};

// Translations for the non-English landing pages.
// NOTE: Safety/legal copy — review by native speakers recommended.
export const CONTENT: Record<string, LangContent> = {
  zh: {
    heading: "加拿大电话查询 — 查明谁打来的",
    intro: "查询任何加拿大电话号码，了解谁打来的电话，以及它是否是已知的诈骗电话。",
    description: "免费查询加拿大电话号码，识别诈骗、骚扰和推销电话（简体中文）。",
    searchButton: "查询",
    scamTitle: "针对华人社区的常见骗局",
    scamBody:
      "骗子常冒充加拿大税务局（CRA）或移民官员，用逮捕或遣返来恐吓华语人士。请记住：真正的政府机构绝不会用这种方式威胁您。",
    rightsTitle: "了解您的权利",
    rights: [
      "加拿大税务局（CRA）绝不会威胁逮捕您，也不会要求用礼品卡付款。",
      "您随时可以挂断电话。您并没有惹上麻烦。",
      "如对税务有疑问，请直接致电 CRA：1-800-959-8281。",
    ],
    backToEnglish: "查看英文版",
  },
  "zh-tw": {
    heading: "加拿大電話查詢 — 查明誰打來的",
    intro: "查詢任何加拿大電話號碼，了解誰打來的電話，以及它是否為已知的詐騙電話。",
    description: "免費查詢加拿大電話號碼，辨識詐騙、騷擾和推銷電話（繁體中文）。",
    searchButton: "查詢",
    scamTitle: "針對華人社區的常見騙局",
    scamBody:
      "騙徒常冒充加拿大稅務局（CRA）或移民官員，以逮捕或遣返恐嚇華語人士。請記住：真正的政府機構絕不會以這種方式威脅您。",
    rightsTitle: "了解您的權利",
    rights: [
      "加拿大稅務局（CRA）絕不會威脅逮捕您，也不會要求以禮品卡付款。",
      "您隨時可以掛斷電話。您並沒有惹上麻煩。",
      "若對稅務有疑問，請直接致電 CRA：1-800-959-8281。",
    ],
    backToEnglish: "查看英文版",
  },
  pa: {
    heading: "ਕੈਨੇਡਾ ਫ਼ੋਨ ਲੁੱਕਅੱਪ — ਪਤਾ ਕਰੋ ਕਿਸਨੇ ਫ਼ੋਨ ਕੀਤਾ",
    intro:
      "ਕਿਸੇ ਵੀ ਕੈਨੇਡੀਅਨ ਫ਼ੋਨ ਨੰਬਰ ਦੀ ਖੋਜ ਕਰੋ ਅਤੇ ਜਾਣੋ ਕਿ ਕਿਸਨੇ ਕਾਲ ਕੀਤੀ ਅਤੇ ਕੀ ਇਹ ਕੋਈ ਜਾਣਿਆ-ਪਛਾਣਿਆ ਧੋਖਾ ਹੈ।",
    description: "ਕੈਨੇਡੀਅਨ ਫ਼ੋਨ ਨੰਬਰ ਲੱਭੋ ਅਤੇ ਧੋਖਿਆਂ ਦੀ ਪਛਾਣ ਕਰੋ (ਪੰਜਾਬੀ)।",
    searchButton: "ਖੋਜੋ",
    scamTitle: "ਦੱਖਣੀ ਏਸ਼ੀਆਈ ਭਾਈਚਾਰੇ ਨੂੰ ਨਿਸ਼ਾਨਾ ਬਣਾਉਂਦੇ ਆਮ ਧੋਖੇ",
    scamBody:
      "ਠੱਗ ਅਕਸਰ CRA ਜਾਂ IRCC (ਇਮੀਗ੍ਰੇਸ਼ਨ) ਅਫ਼ਸਰ ਬਣ ਕੇ ਗ੍ਰਿਫ਼ਤਾਰੀ ਜਾਂ ਡਿਪੋਰਟ ਕਰਨ ਦਾ ਡਰਾਵਾ ਦਿੰਦੇ ਹਨ। ਯਾਦ ਰੱਖੋ: ਅਸਲੀ ਸਰਕਾਰੀ ਅਦਾਰੇ ਇਸ ਤਰ੍ਹਾਂ ਧਮਕੀ ਨਹੀਂ ਦਿੰਦੇ।",
    rightsTitle: "ਆਪਣੇ ਹੱਕ ਜਾਣੋ",
    rights: [
      "CRA ਕਦੇ ਵੀ ਗ੍ਰਿਫ਼ਤਾਰੀ ਦੀ ਧਮਕੀ ਨਹੀਂ ਦਿੰਦਾ ਅਤੇ ਨਾ ਹੀ ਗਿਫ਼ਟ ਕਾਰਡ ਮੰਗਦਾ ਹੈ।",
      "ਤੁਸੀਂ ਕਦੇ ਵੀ ਫ਼ੋਨ ਕੱਟ ਸਕਦੇ ਹੋ। ਤੁਸੀਂ ਕਿਸੇ ਮੁਸੀਬਤ ਵਿੱਚ ਨਹੀਂ ਹੋ।",
      "ਟੈਕਸ ਬਾਰੇ ਚਿੰਤਾ ਹੋਵੇ ਤਾਂ ਸਿੱਧਾ CRA ਨੂੰ ਕਾਲ ਕਰੋ: 1-800-959-8281।",
    ],
    backToEnglish: "ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਵੇਖੋ",
  },
  tl: {
    heading: "Canada Phone Lookup — Alamin Kung Sino ang Tumawag",
    intro:
      "Hanapin ang anumang numero ng telepono sa Canada para malaman kung sino ang tumawag at kung ito ay kilalang scam.",
    description: "Maghanap ng numero ng telepono sa Canada at suriin kung scam (Filipino).",
    searchButton: "Hanapin",
    scamTitle: "Mga karaniwang scam sa komunidad ng Pilipino",
    scamBody:
      "Madalas magpanggap ang mga scammer bilang opisyal ng immigration para takutin ang mga Pilipinong manggagawa ng deportasyon o pagkawala ng trabaho. Tandaan: hindi ganito nagbabanta ang tunay na ahensya ng gobyerno.",
    rightsTitle: "Alamin ang Iyong mga Karapatan",
    rights: [
      "Hindi ka kailanman tatakutin ng CRA ng pag-aresto o hihingi ng gift cards.",
      "Puwede kang magbaba ng telepono anumang oras. Wala kang problema.",
      "Kung nag-aalala ka sa buwis, tumawag mismo sa CRA: 1-800-959-8281.",
    ],
    backToEnglish: "Tingnan sa Ingles",
  },
  ar: {
    heading: "البحث عن أرقام الهاتف في كندا — اعرف من اتصل بك",
    intro: "ابحث عن أي رقم هاتف كندي لمعرفة من اتصل بك وما إذا كان احتيالًا معروفًا.",
    description: "ابحث عن أرقام الهاتف الكندية وتحقق من عمليات الاحتيال (بالعربية).",
    searchButton: "بحث",
    scamTitle: "عمليات احتيال شائعة تستهدف الناطقين بالعربية",
    scamBody:
      "غالبًا ما ينتحل المحتالون صفة وكالة الإيرادات الكندية (CRA) أو ضباط الهجرة لتخويف الناطقين بالعربية بالاعتقال أو الترحيل. تذكّر: الجهات الحكومية الحقيقية لا تهدد بهذه الطريقة.",
    rightsTitle: "اعرف حقوقك",
    rights: [
      "لن تهددك CRA أبدًا بالاعتقال ولن تطلب بطاقات هدايا.",
      "يمكنك إنهاء المكالمة في أي وقت. أنت لست في ورطة.",
      "إذا كنت قلقًا بشأن الضرائب، اتصل مباشرة بـ CRA: 1-800-959-8281.",
    ],
    backToEnglish: "عرض بالإنجليزية",
  },
  hi: {
    heading: "कनाडा फोन लुकअप — जानें किसने कॉल किया",
    intro:
      "किसी भी कैनेडियन फ़ोन नंबर को खोजें और जानें कि किसने कॉल किया और क्या यह कोई जाना-पहचाना घोटाला है।",
    description: "कैनेडियन फ़ोन नंबर खोजें और घोटालों की जाँच करें (हिंदी)।",
    searchButton: "खोजें",
    scamTitle: "नए भारतीय प्रवासियों को निशाना बनाने वाले आम घोटाले",
    scamBody:
      "ठग अक्सर CRA या इमिग्रेशन अधिकारी बनकर भारतीय नवागंतुकों को गिरफ़्तारी या डिपोर्ट करने का डर दिखाते हैं। याद रखें: असली सरकारी एजेंसियाँ इस तरह धमकी नहीं देतीं।",
    rightsTitle: "अपने अधिकार जानें",
    rights: [
      "CRA कभी गिरफ़्तारी की धमकी नहीं देता और न ही गिफ़्ट कार्ड माँगता है।",
      "आप कभी भी फ़ोन काट सकते हैं। आप किसी मुसीबत में नहीं हैं।",
      "टैक्स को लेकर चिंता हो तो सीधे CRA को कॉल करें: 1-800-959-8281।",
    ],
    backToEnglish: "अंग्रेज़ी में देखें",
  },
  fr: {
    heading: "Recherche téléphonique au Canada — Découvrez qui a appelé",
    intro:
      "Recherchez n'importe quel numéro de téléphone canadien pour savoir qui a appelé et s'il s'agit d'une arnaque connue.",
    description:
      "Recherchez des numéros de téléphone canadiens et repérez les arnaques (en français).",
    searchButton: "Rechercher",
    scamTitle: "Arnaques courantes : Revenu Québec et appels bilingues",
    scamBody:
      "Les fraudeurs se font souvent passer pour l'ARC ou Revenu Québec, parfois en français et en anglais, pour vous effrayer avec des menaces d'arrestation. Rappelez-vous : une véritable agence ne menace jamais ainsi.",
    rightsTitle: "Connaissez vos droits",
    rights: [
      "L'ARC ne vous menacera jamais d'arrestation et ne demandera jamais de cartes-cadeaux.",
      "Vous pouvez raccrocher à tout moment. Vous n'avez pas d'ennuis.",
      "En cas de doute sur vos impôts, appelez directement l'ARC : 1-800-959-8281.",
    ],
    backToEnglish: "Voir en anglais",
  },
  es: {
    heading: "Búsqueda telefónica en Canadá — Descubre quién llamó",
    intro:
      "Busca cualquier número de teléfono canadiense para saber quién llamó y si es una estafa conocida.",
    description:
      "Busca números de teléfono canadienses y detecta estafas (en español).",
    searchButton: "Buscar",
    scamTitle: "Estafas comunes contra recién llegados latinoamericanos",
    scamBody:
      "Los estafadores suelen hacerse pasar por agentes de inmigración o de la CRA para asustar a los recién llegados con amenazas de deportación o arresto. Recuerda: una agencia real nunca amenaza de esta forma.",
    rightsTitle: "Conoce tus derechos",
    rights: [
      "La CRA nunca te amenazará con arresto ni te pedirá tarjetas de regalo.",
      "Puedes colgar en cualquier momento. No estás en problemas.",
      "Si te preocupan tus impuestos, llama directamente a la CRA: 1-800-959-8281.",
    ],
    backToEnglish: "Ver en inglés",
  },
  ko: {
    heading: "캐나다 전화 조회 — 누가 전화했는지 알아보세요",
    intro: "캐나다 전화번호를 조회하여 누가 전화했는지, 알려진 사기 전화인지 확인하세요.",
    description: "캐나다 전화번호를 조회하고 사기 전화를 확인하세요 (한국어).",
    searchButton: "조회",
    scamTitle: "한인 커뮤니티를 노리는 투자 사기",
    scamBody:
      "사기꾼들은 종종 고수익을 약속하는 투자 사기나 정부 기관 사칭으로 한인들을 노립니다. 기억하세요: 진짜 기관은 이런 식으로 협박하거나 송금을 요구하지 않습니다.",
    rightsTitle: "권리를 알아두세요",
    rights: [
      "CRA는 절대 체포로 위협하거나 기프트 카드를 요구하지 않습니다.",
      "언제든지 전화를 끊을 수 있습니다. 당신은 곤경에 빠진 것이 아닙니다.",
      "세금이 걱정되면 CRA에 직접 전화하세요: 1-800-959-8281.",
    ],
    backToEnglish: "영어로 보기",
  },
  vi: {
    heading: "Tra cứu số điện thoại Canada — Biết ai đã gọi",
    intro:
      "Tra cứu bất kỳ số điện thoại Canada nào để biết ai đã gọi và liệu đó có phải là lừa đảo đã biết hay không.",
    description: "Tra cứu số điện thoại Canada và kiểm tra lừa đảo (tiếng Việt).",
    searchButton: "Tra cứu",
    scamTitle: "Các trò lừa đảo nhắm vào người Việt mới định cư",
    scamBody:
      "Kẻ lừa đảo thường giả danh CRA hoặc nhân viên di trú để dọa người Việt mới đến bằng việc bắt giữ hoặc trục xuất. Hãy nhớ: cơ quan chính phủ thật sự không bao giờ đe dọa như vậy.",
    rightsTitle: "Biết quyền của bạn",
    rights: [
      "CRA sẽ không bao giờ dọa bắt giữ bạn hay yêu cầu thẻ quà tặng.",
      "Bạn có thể cúp máy bất cứ lúc nào. Bạn không gặp rắc rối gì.",
      "Nếu lo lắng về thuế, hãy gọi trực tiếp cho CRA: 1-800-959-8281.",
    ],
    backToEnglish: "Xem bằng tiếng Anh",
  },
};

// Interpolate "[token]" placeholders, e.g. interp("Is [number] spam?", {number}).
export function interp(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\[(\w+)\]/g, (_, k) => String(vars[k] ?? ""));
}

export type ReassureStrings = {
  craTitle: string; craBody: string;
  debtTitle: string; debtBody: string;
  teleTitle: string; teleBody: string;
  spamTitle: string; spamBody: string;
};

export type LookupStrings = {
  title: string; // "[number]" placeholder
  description: string; // "[number]" placeholder
  verifiedLegitimate: string;
  likelySpam: string;
  noReports: string;
  noReportsBody: string;
  reportsFlagged: string; // "[spam]" + "[total]" placeholders
  recentComments: string;
  reportThisNumber: string;
  backToSearch: string;
  invalidTitle: string;
  invalidBody: string; // "[number]" placeholder
  form: {
    isSpam: string;
    type: string;
    comment: string;
    commentPlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
  };
  reassure: ReassureStrings;
};

// Translations for the multilingual lookup pages (non-English locales only).
// NOTE: safety/legal copy — native-speaker review recommended.
export const LOOKUP_CONTENT: Record<string, LookupStrings> = {
  zh: {
    title: "[number] 是垃圾电话吗？",
    description: "查询 [number]：了解谁打来的电话，以及它是否是诈骗或骚扰电话。",
    verifiedLegitimate: "已验证合法",
    likelySpam: "可能是垃圾电话",
    noReports: "暂无举报",
    noReportsBody: "我们暂时没有关于这个号码的信息。如果您接到它的来电，请在下方举报以帮助他人。",
    reportsFlagged: "[total] 条举报中有 [spam] 条将此号码标记为垃圾电话",
    recentComments: "最新评论",
    reportThisNumber: "举报此号码",
    backToSearch: "返回搜索",
    invalidTitle: "号码格式不正确",
    invalidBody: "“[number]”不是有效的 10 位加拿大电话号码。",
    form: { isSpam: "此号码是垃圾/骚扰电话", type: "来电类型", comment: "评论", commentPlaceholder: "通话中发生了什么？", submit: "提交举报", submitting: "提交中…", success: "谢谢！您的举报已提交。", error: "无法保存您的举报，请重试。" },
    reassure: {
      craTitle: "深呼吸 — 这是已知的骗局。🍁",
      craBody: "真正的加拿大税务局（CRA）人员绝不会威胁逮捕、索要礼品卡或要求立即付款。如担心税务问题，请直接致电 CRA：1-800-959-8281。您没有惹上麻烦。",
      debtTitle: "您有权利。加拿大法律保护您。🍁",
      debtBody: "催债公司不得威胁您、在早上7点前或晚上9点后致电，或联系您的雇主。您不必独自面对。",
      teleTitle: "厌倦了骚扰电话？您可以免费阻止大部分。",
      teleBody: "在加拿大“谢绝来电名单”（lnnte-dncl.gc.ca）登记您的号码 — 只需2分钟，且免费。",
      spamTitle: "不要回拨。不要按任何按键。",
      spamBody: "如果这通电话让您担心，您并不孤单 — 每年有数百万加拿大人接到诈骗电话。请在下方举报以保护他人。",
    },
  },
  "zh-tw": {
    title: "[number] 是垃圾電話嗎？",
    description: "查詢 [number]：了解誰打來的電話，以及它是否為詐騙或騷擾電話。",
    verifiedLegitimate: "已驗證合法",
    likelySpam: "可能是垃圾電話",
    noReports: "暫無舉報",
    noReportsBody: "我們暫時沒有關於這個號碼的資訊。如果您接到它的來電，請在下方舉報以幫助他人。",
    reportsFlagged: "[total] 則舉報中有 [spam] 則將此號碼標記為垃圾電話",
    recentComments: "最新評論",
    reportThisNumber: "舉報此號碼",
    backToSearch: "返回搜尋",
    invalidTitle: "號碼格式不正確",
    invalidBody: "「[number]」不是有效的 10 位加拿大電話號碼。",
    form: { isSpam: "此號碼是垃圾/騷擾電話", type: "來電類型", comment: "評論", commentPlaceholder: "通話中發生了什麼？", submit: "提交舉報", submitting: "提交中…", success: "謝謝！您的舉報已提交。", error: "無法儲存您的舉報，請重試。" },
    reassure: {
      craTitle: "深呼吸 — 這是已知的騙局。🍁",
      craBody: "真正的加拿大稅務局（CRA）人員絕不會威脅逮捕、索要禮品卡或要求立即付款。如擔心稅務問題，請直接致電 CRA：1-800-959-8281。您並沒有惹上麻煩。",
      debtTitle: "您有權利。加拿大法律保護您。🍁",
      debtBody: "討債公司不得威脅您、在早上7點前或晚上9點後致電，或聯絡您的僱主。您不必獨自面對。",
      teleTitle: "厭倦了騷擾電話？您可以免費阻止大部分。",
      teleBody: "在加拿大「謝絕來電名單」（lnnte-dncl.gc.ca）登記您的號碼 — 只需2分鐘，且免費。",
      spamTitle: "不要回撥。不要按任何按鍵。",
      spamBody: "如果這通電話讓您擔心，您並不孤單 — 每年有數百萬加拿大人接到詐騙電話。請在下方舉報以保護他人。",
    },
  },
  pa: {
    title: "ਕੀ [number] ਸਪੈਮ ਹੈ?",
    description: "[number] ਦੀ ਖੋਜ ਕਰੋ: ਜਾਣੋ ਕਿਸਨੇ ਕਾਲ ਕੀਤੀ ਅਤੇ ਕੀ ਇਹ ਧੋਖਾ ਜਾਂ ਪਰੇਸ਼ਾਨ ਕਰਨ ਵਾਲੀ ਕਾਲ ਹੈ।",
    verifiedLegitimate: "ਪ੍ਰਮਾਣਿਤ ਅਤੇ ਜਾਇਜ਼",
    likelySpam: "ਸੰਭਵ ਤੌਰ 'ਤੇ ਸਪੈਮ",
    noReports: "ਹਾਲੇ ਕੋਈ ਰਿਪੋਰਟ ਨਹੀਂ",
    noReportsBody: "ਸਾਡੇ ਕੋਲ ਇਸ ਨੰਬਰ ਬਾਰੇ ਹਾਲੇ ਕੋਈ ਜਾਣਕਾਰੀ ਨਹੀਂ ਹੈ। ਜੇ ਤੁਹਾਨੂੰ ਇਸ ਤੋਂ ਕਾਲ ਆਈ ਹੈ, ਤਾਂ ਹੇਠਾਂ ਰਿਪੋਰਟ ਕਰਕੇ ਹੋਰਾਂ ਦੀ ਮਦਦ ਕਰੋ।",
    reportsFlagged: "[total] ਰਿਪੋਰਟਾਂ ਵਿੱਚੋਂ [spam] ਨੇ ਇਸ ਨੰਬਰ ਨੂੰ ਸਪੈਮ ਦੱਸਿਆ",
    recentComments: "ਤਾਜ਼ਾ ਟਿੱਪਣੀਆਂ",
    reportThisNumber: "ਇਸ ਨੰਬਰ ਦੀ ਰਿਪੋਰਟ ਕਰੋ",
    backToSearch: "ਖੋਜ 'ਤੇ ਵਾਪਸ",
    invalidTitle: "ਨੰਬਰ ਸਹੀ ਨਹੀਂ ਲੱਗਦਾ",
    invalidBody: "“[number]” ਇੱਕ ਜਾਇਜ਼ 10-ਅੰਕਾਂ ਵਾਲਾ ਕੈਨੇਡੀਅਨ ਫ਼ੋਨ ਨੰਬਰ ਨਹੀਂ ਹੈ।",
    form: { isSpam: "ਇਹ ਨੰਬਰ ਸਪੈਮ/ਅਣਚਾਹਿਆ ਹੈ", type: "ਕਾਲ ਦੀ ਕਿਸਮ", comment: "ਟਿੱਪਣੀ", commentPlaceholder: "ਕਾਲ ਵਿੱਚ ਕੀ ਹੋਇਆ?", submit: "ਰਿਪੋਰਟ ਭੇਜੋ", submitting: "ਭੇਜਿਆ ਜਾ ਰਿਹਾ…", success: "ਧੰਨਵਾਦ! ਤੁਹਾਡੀ ਰਿਪੋਰਟ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ।", error: "ਤੁਹਾਡੀ ਰਿਪੋਰਟ ਸੰਭਾਲੀ ਨਹੀਂ ਜਾ ਸਕੀ। ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।" },
    reassure: {
      craTitle: "ਸਾਹ ਲਓ — ਇਹ ਇੱਕ ਜਾਣਿਆ-ਪਛਾਣਿਆ ਧੋਖਾ ਹੈ। 🍁",
      craBody: "ਅਸਲੀ CRA ਅਫ਼ਸਰ ਕਦੇ ਗ੍ਰਿਫ਼ਤਾਰੀ ਦੀ ਧਮਕੀ ਨਹੀਂ ਦਿੰਦੇ, ਗਿਫ਼ਟ ਕਾਰਡ ਨਹੀਂ ਮੰਗਦੇ, ਜਾਂ ਤੁਰੰਤ ਭੁਗਤਾਨ ਦੀ ਮੰਗ ਨਹੀਂ ਕਰਦੇ। ਟੈਕਸ ਦੀ ਚਿੰਤਾ ਹੋਵੇ ਤਾਂ ਸਿੱਧਾ CRA ਨੂੰ ਕਾਲ ਕਰੋ: 1-800-959-8281। ਤੁਸੀਂ ਕਿਸੇ ਮੁਸੀਬਤ ਵਿੱਚ ਨਹੀਂ ਹੋ।",
      debtTitle: "ਤੁਹਾਡੇ ਹੱਕ ਹਨ। ਕੈਨੇਡੀਅਨ ਕਾਨੂੰਨ ਤੁਹਾਡੀ ਰਾਖੀ ਕਰਦਾ ਹੈ। 🍁",
      debtBody: "ਕਰਜ਼ਾ ਵਸੂਲਣ ਵਾਲੇ ਤੁਹਾਨੂੰ ਧਮਕਾ ਨਹੀਂ ਸਕਦੇ, ਸਵੇਰੇ 7 ਵਜੇ ਤੋਂ ਪਹਿਲਾਂ ਜਾਂ ਰਾਤ 9 ਵਜੇ ਤੋਂ ਬਾਅਦ ਕਾਲ ਨਹੀਂ ਕਰ ਸਕਦੇ, ਜਾਂ ਤੁਹਾਡੇ ਮਾਲਕ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਕਰ ਸਕਦੇ। ਤੁਹਾਨੂੰ ਇਕੱਲੇ ਇਸ ਦਾ ਸਾਹਮਣਾ ਕਰਨ ਦੀ ਲੋੜ ਨਹੀਂ।",
      teleTitle: "ਅਣਚਾਹੀਆਂ ਕਾਲਾਂ ਤੋਂ ਤੰਗ? ਤੁਸੀਂ ਬਹੁਤੀਆਂ ਮੁਫ਼ਤ ਰੋਕ ਸਕਦੇ ਹੋ।",
      teleBody: "ਕੈਨੇਡਾ ਦੀ Do Not Call List (lnnte-dncl.gc.ca) 'ਤੇ ਆਪਣਾ ਨੰਬਰ ਰਜਿਸਟਰ ਕਰੋ — ਸਿਰਫ਼ 2 ਮਿੰਟ, ਮੁਫ਼ਤ।",
      spamTitle: "ਵਾਪਸ ਕਾਲ ਨਾ ਕਰੋ। ਕੋਈ ਬਟਨ ਨਾ ਦਬਾਓ।",
      spamBody: "ਜੇ ਇਸ ਕਾਲ ਨੇ ਤੁਹਾਨੂੰ ਚਿੰਤਤ ਕੀਤਾ, ਤਾਂ ਤੁਸੀਂ ਇਕੱਲੇ ਨਹੀਂ — ਹਰ ਸਾਲ ਲੱਖਾਂ ਕੈਨੇਡੀਅਨ ਧੋਖੇ ਵਾਲੀਆਂ ਕਾਲਾਂ ਪ੍ਰਾਪਤ ਕਰਦੇ ਹਨ। ਹੋਰਾਂ ਦੀ ਰਾਖੀ ਲਈ ਹੇਠਾਂ ਰਿਪੋਰਟ ਕਰੋ।",
    },
  },
  tl: {
    title: "Spam ba ang [number]?",
    description: "Hanapin ang [number]: alamin kung sino ang tumawag at kung ito ay scam o hindi gustong tawag.",
    verifiedLegitimate: "Beripikado at Lehitimo",
    likelySpam: "Malamang spam",
    noReports: "Wala pang ulat",
    noReportsBody: "Wala pa kaming impormasyon tungkol sa numerong ito. Kung tinawagan ka nito, mag-ulat sa ibaba para matulungan ang iba.",
    reportsFlagged: "[spam] sa [total] na ulat ang nagtatak dito bilang spam",
    recentComments: "Mga kamakailang komento",
    reportThisNumber: "Iulat ang numerong ito",
    backToSearch: "Bumalik sa paghahanap",
    invalidTitle: "Mukhang mali ang numero",
    invalidBody: "Ang “[number]” ay hindi wastong 10-digit na numero sa Canada.",
    form: { isSpam: "Spam / hindi gustong tawag ang numerong ito", type: "Uri ng tawag", comment: "Komento", commentPlaceholder: "Ano ang nangyari sa tawag?", submit: "Ipasa ang ulat", submitting: "Ipinapasa…", success: "Salamat! Naipasa na ang iyong ulat.", error: "Hindi na-save ang iyong ulat. Subukang muli." },
    reassure: {
      craTitle: "Huminga ka muna — kilalang scam ito. 🍁",
      craBody: "Hindi ka kailanman tatakutin ng tunay na CRA ng pag-aresto, hihingi ng gift cards, o maniningil agad. Kung nag-aalala ka sa buwis, tumawag mismo sa CRA: 1-800-959-8281. Wala kang problema.",
      debtTitle: "May mga karapatan ka. Pinoprotektahan ka ng batas ng Canada. 🍁",
      debtBody: "Hindi ka maaaring takutin ng collector, tumawag bago mag-7am o pagkatapos ng 9pm, o makipag-ugnayan sa iyong amo. Hindi mo ito kailangang harapin nang mag-isa.",
      teleTitle: "Sawa na sa mga tawag? Mapipigilan mo ang karamihan nang libre.",
      teleBody: "Irehistro ang numero mo sa Do Not Call List ng Canada (lnnte-dncl.gc.ca) — 2 minuto lang, libre.",
      spamTitle: "Huwag tumawag pabalik. Huwag pumindot ng kahit ano.",
      spamBody: "Kung ikinabahala ka ng tawag na ito, hindi ka nag-iisa — milyon-milyong Canadian ang nakakaranas ng scam taun-taon. Mag-ulat sa ibaba para maprotektahan ang iba.",
    },
  },
  ar: {
    title: "هل [number] رقم مزعج؟",
    description: "ابحث عن [number]: اعرف من اتصل وما إذا كان احتيالًا أو مكالمة مزعجة.",
    verifiedLegitimate: "موثوق وشرعي",
    likelySpam: "على الأرجح مزعج",
    noReports: "لا توجد بلاغات بعد",
    noReportsBody: "ليست لدينا معلومات عن هذا الرقم بعد. إذا اتصل بك، فأبلغ أدناه لمساعدة الآخرين.",
    reportsFlagged: "[spam] من [total] بلاغًا وضعوا علامة على هذا الرقم كمزعج",
    recentComments: "أحدث التعليقات",
    reportThisNumber: "أبلغ عن هذا الرقم",
    backToSearch: "العودة إلى البحث",
    invalidTitle: "الرقم غير صحيح",
    invalidBody: "«[number]» ليس رقم هاتف كندي صالحًا مكوّنًا من 10 أرقام.",
    form: { isSpam: "هذا الرقم مزعج / غير مرغوب", type: "نوع المكالمة", comment: "تعليق", commentPlaceholder: "ماذا حدث في المكالمة؟", submit: "إرسال البلاغ", submitting: "جارٍ الإرسال…", success: "شكرًا! تم إرسال بلاغك.", error: "تعذّر حفظ بلاغك. حاول مرة أخرى." },
    reassure: {
      craTitle: "خذ نفسًا — هذه عملية احتيال معروفة. 🍁",
      craBody: "موظفو CRA الحقيقيون لا يهددون بالاعتقال أبدًا، ولا يطلبون بطاقات هدايا، ولا يطالبون بدفع فوري. إذا كنت قلقًا بشأن الضرائب، اتصل مباشرة بـ CRA: 1-800-959-8281. أنت لست في ورطة.",
      debtTitle: "لديك حقوق. القانون الكندي يحميك. 🍁",
      debtBody: "لا يمكن لمحصّلي الديون تهديدك، أو الاتصال قبل السابعة صباحًا أو بعد التاسعة مساءً، أو الاتصال بصاحب عملك. لست مضطرًا لمواجهة هذا وحدك.",
      teleTitle: "سئمت المكالمات غير المرغوبة؟ يمكنك إيقاف معظمها مجانًا.",
      teleBody: "سجّل رقمك في قائمة عدم الاتصال الكندية (lnnte-dncl.gc.ca) — دقيقتان فقط، ومجانًا.",
      spamTitle: "لا تعاود الاتصال. لا تضغط أي أرقام.",
      spamBody: "إذا أقلقتك هذه المكالمة، فأنت لست وحدك — ملايين الكنديين يتلقون مكالمات احتيالية كل عام. أبلغ أدناه لحماية الآخرين.",
    },
  },
  hi: {
    title: "क्या [number] स्पैम है?",
    description: "[number] खोजें: जानें किसने कॉल किया और क्या यह घोटाला या परेशान करने वाली कॉल है।",
    verifiedLegitimate: "सत्यापित और वैध",
    likelySpam: "संभवतः स्पैम",
    noReports: "अभी कोई रिपोर्ट नहीं",
    noReportsBody: "हमारे पास इस नंबर के बारे में अभी कोई जानकारी नहीं है। यदि आपको इससे कॉल आई है, तो नीचे रिपोर्ट करके दूसरों की मदद करें।",
    reportsFlagged: "[total] रिपोर्टों में से [spam] ने इस नंबर को स्पैम बताया",
    recentComments: "हाल की टिप्पणियाँ",
    reportThisNumber: "इस नंबर की रिपोर्ट करें",
    backToSearch: "खोज पर वापस",
    invalidTitle: "नंबर सही नहीं लगता",
    invalidBody: "“[number]” एक वैध 10-अंकों वाला कैनेडियन फ़ोन नंबर नहीं है।",
    form: { isSpam: "यह नंबर स्पैम/अवांछित है", type: "कॉल का प्रकार", comment: "टिप्पणी", commentPlaceholder: "कॉल में क्या हुआ?", submit: "रिपोर्ट भेजें", submitting: "भेजा जा रहा…", success: "धन्यवाद! आपकी रिपोर्ट भेज दी गई है।", error: "आपकी रिपोर्ट सहेजी नहीं जा सकी। पुनः प्रयास करें।" },
    reassure: {
      craTitle: "एक साँस लें — यह एक ज्ञात घोटाला है। 🍁",
      craBody: "असली CRA अधिकारी कभी गिरफ़्तारी की धमकी नहीं देते, गिफ़्ट कार्ड नहीं माँगते, या तुरंत भुगतान की माँग नहीं करते। टैक्स की चिंता हो तो सीधे CRA को कॉल करें: 1-800-959-8281। आप किसी मुसीबत में नहीं हैं।",
      debtTitle: "आपके अधिकार हैं। कैनेडियन कानून आपकी रक्षा करता है। 🍁",
      debtBody: "वसूली एजेंट आपको धमका नहीं सकते, सुबह 7 बजे से पहले या रात 9 बजे के बाद कॉल नहीं कर सकते, या आपके नियोक्ता से संपर्क नहीं कर सकते। आपको अकेले इसका सामना करने की ज़रूरत नहीं।",
      teleTitle: "अनचाही कॉलों से परेशान? आप अधिकांश को मुफ़्त में रोक सकते हैं।",
      teleBody: "कनाडा की Do Not Call List (lnnte-dncl.gc.ca) पर अपना नंबर रजिस्टर करें — सिर्फ़ 2 मिनट, मुफ़्त।",
      spamTitle: "वापस कॉल न करें। कोई बटन न दबाएँ।",
      spamBody: "यदि इस कॉल ने आपको चिंतित किया, तो आप अकेले नहीं हैं — हर साल लाखों कैनेडियन घोटाले वाली कॉल पाते हैं। दूसरों की रक्षा के लिए नीचे रिपोर्ट करें।",
    },
  },
  fr: {
    title: "[number] est-il un spam ?",
    description: "Recherchez [number] : découvrez qui a appelé et s'il s'agit d'une arnaque ou d'un appel indésirable.",
    verifiedLegitimate: "Numéro légitime vérifié",
    likelySpam: "Probablement un spam",
    noReports: "Aucun signalement",
    noReportsBody: "Nous n'avons pas encore d'information sur ce numéro. Si vous avez reçu un appel, signalez-le ci-dessous pour aider les autres.",
    reportsFlagged: "[spam] signalement(s) sur [total] ont marqué ce numéro comme indésirable",
    recentComments: "Commentaires récents",
    reportThisNumber: "Signaler ce numéro",
    backToSearch: "Retour à la recherche",
    invalidTitle: "Ce numéro semble incorrect",
    invalidBody: "« [number] » n'est pas un numéro canadien valide à 10 chiffres.",
    form: { isSpam: "Ce numéro est indésirable", type: "Type d'appel", comment: "Commentaire", commentPlaceholder: "Que s'est-il passé pendant l'appel ?", submit: "Envoyer le signalement", submitting: "Envoi…", success: "Merci ! Votre signalement a été envoyé.", error: "Impossible d'enregistrer votre signalement. Réessayez." },
    reassure: {
      craTitle: "Respirez — c'est une arnaque connue. 🍁",
      craBody: "Les vrais agents de l'ARC ne menacent jamais d'arrestation, ne demandent pas de cartes-cadeaux et n'exigent pas de paiement immédiat. En cas de doute sur vos impôts, appelez l'ARC : 1-800-959-8281. Vous n'avez pas d'ennuis.",
      debtTitle: "Vous avez des droits. La loi canadienne vous protège. 🍁",
      debtBody: "Les agences de recouvrement ne peuvent pas vous menacer, appeler avant 7h ou après 21h, ni contacter votre employeur. Vous n'êtes pas seul.",
      teleTitle: "Fatigué des appels indésirables ? Bloquez-en la plupart gratuitement.",
      teleBody: "Inscrivez votre numéro sur la Liste nationale de numéros de télécommunication exclus (lnnte-dncl.gc.ca) — 2 minutes, gratuit.",
      spamTitle: "Ne rappelez pas. N'appuyez sur aucune touche.",
      spamBody: "Si cet appel vous a inquiété, vous n'êtes pas seul — des millions de Canadiens reçoivent des appels frauduleux chaque année. Signalez-le ci-dessous pour protéger les autres.",
    },
  },
  es: {
    title: "¿[number] es spam?",
    description: "Busca [number]: descubre quién llamó y si es una estafa o llamada no deseada.",
    verifiedLegitimate: "Legítimo verificado",
    likelySpam: "Probablemente spam",
    noReports: "Sin reportes aún",
    noReportsBody: "Todavía no tenemos información sobre este número. Si te llamaron, repórtalo abajo para ayudar a los demás.",
    reportsFlagged: "[spam] de [total] reportes marcaron este número como no deseado",
    recentComments: "Comentarios recientes",
    reportThisNumber: "Reportar este número",
    backToSearch: "Volver a la búsqueda",
    invalidTitle: "Ese número no parece correcto",
    invalidBody: "«[number]» no es un número canadiense válido de 10 dígitos.",
    form: { isSpam: "Este número es spam / no deseado", type: "Tipo de llamada", comment: "Comentario", commentPlaceholder: "¿Qué pasó en la llamada?", submit: "Enviar reporte", submitting: "Enviando…", success: "¡Gracias! Tu reporte fue enviado.", error: "No se pudo guardar tu reporte. Inténtalo de nuevo." },
    reassure: {
      craTitle: "Respira — es una estafa conocida. 🍁",
      craBody: "Los agentes reales de la CRA nunca amenazan con arresto, piden tarjetas de regalo ni exigen pago inmediato. Si te preocupan tus impuestos, llama a la CRA: 1-800-959-8281. No estás en problemas.",
      debtTitle: "Tienes derechos. La ley canadiense te protege. 🍁",
      debtBody: "Los cobradores no pueden amenazarte, llamar antes de las 7am o después de las 9pm, ni contactar a tu empleador. No tienes que enfrentar esto solo.",
      teleTitle: "¿Cansado de llamadas no deseadas? Puedes detener la mayoría gratis.",
      teleBody: "Registra tu número en la Lista de Números Excluidos de Canadá (lnnte-dncl.gc.ca) — solo 2 minutos, gratis.",
      spamTitle: "No devuelvas la llamada. No presiones ningún número.",
      spamBody: "Si esta llamada te preocupó, no estás solo — millones de canadienses reciben llamadas fraudulentas cada año. Repórtalo abajo para proteger a otros.",
    },
  },
  ko: {
    title: "[number]은 스팸 전화인가요?",
    description: "[number] 조회: 누가 전화했는지, 사기 또는 원치 않는 전화인지 확인하세요.",
    verifiedLegitimate: "인증된 정상 번호",
    likelySpam: "스팸일 가능성 높음",
    noReports: "아직 신고 없음",
    noReportsBody: "이 번호에 대한 정보가 아직 없습니다. 전화를 받으셨다면 아래에 신고하여 다른 사람을 도와주세요.",
    reportsFlagged: "[total]건의 신고 중 [spam]건이 이 번호를 스팸으로 표시했습니다",
    recentComments: "최근 댓글",
    reportThisNumber: "이 번호 신고하기",
    backToSearch: "검색으로 돌아가기",
    invalidTitle: "번호가 올바르지 않습니다",
    invalidBody: "“[number]”은(는) 유효한 10자리 캐나다 전화번호가 아닙니다.",
    form: { isSpam: "이 번호는 스팸/원치 않는 전화입니다", type: "전화 유형", comment: "댓글", commentPlaceholder: "통화에서 무슨 일이 있었나요?", submit: "신고 제출", submitting: "제출 중…", success: "감사합니다! 신고가 제출되었습니다.", error: "신고를 저장할 수 없습니다. 다시 시도하세요." },
    reassure: {
      craTitle: "잠시 숨을 고르세요 — 알려진 사기입니다. 🍁",
      craBody: "실제 CRA 직원은 절대 체포로 위협하거나, 기프트 카드를 요구하거나, 즉시 납부를 요구하지 않습니다. 세금이 걱정되면 CRA에 직접 전화하세요: 1-800-959-8281. 당신은 곤경에 빠진 것이 아닙니다.",
      debtTitle: "당신에게는 권리가 있습니다. 캐나다 법이 당신을 보호합니다. 🍁",
      debtBody: "채권 추심원은 당신을 위협하거나, 오전 7시 이전 또는 오후 9시 이후에 전화하거나, 고용주에게 연락할 수 없습니다. 혼자 감당하지 않아도 됩니다.",
      teleTitle: "원치 않는 전화에 지치셨나요? 대부분 무료로 차단할 수 있습니다.",
      teleBody: "캐나다 수신 거부 목록(lnnte-dncl.gc.ca)에 번호를 등록하세요 — 2분이면 되고 무료입니다.",
      spamTitle: "다시 전화하지 마세요. 어떤 번호도 누르지 마세요.",
      spamBody: "이 전화로 불안하셨다면 혼자가 아닙니다 — 매년 수백만 명의 캐나다인이 사기 전화를 받습니다. 다른 사람을 보호하기 위해 아래에 신고하세요.",
    },
  },
  vi: {
    title: "[number] có phải là cuộc gọi rác không?",
    description: "Tra cứu [number]: biết ai đã gọi và liệu đó có phải lừa đảo hay cuộc gọi làm phiền.",
    verifiedLegitimate: "Đã xác minh hợp lệ",
    likelySpam: "Có thể là cuộc gọi rác",
    noReports: "Chưa có báo cáo",
    noReportsBody: "Chúng tôi chưa có thông tin về số này. Nếu bạn nhận được cuộc gọi từ số này, hãy báo cáo bên dưới để giúp người khác.",
    reportsFlagged: "[spam] trên [total] báo cáo đã đánh dấu số này là rác",
    recentComments: "Bình luận gần đây",
    reportThisNumber: "Báo cáo số này",
    backToSearch: "Quay lại tìm kiếm",
    invalidTitle: "Số này có vẻ không đúng",
    invalidBody: "“[number]” không phải là số điện thoại Canada hợp lệ gồm 10 chữ số.",
    form: { isSpam: "Số này là rác / không mong muốn", type: "Loại cuộc gọi", comment: "Bình luận", commentPlaceholder: "Điều gì đã xảy ra trong cuộc gọi?", submit: "Gửi báo cáo", submitting: "Đang gửi…", success: "Cảm ơn! Báo cáo của bạn đã được gửi.", error: "Không thể lưu báo cáo. Vui lòng thử lại." },
    reassure: {
      craTitle: "Hãy hít thở — đây là trò lừa đảo đã biết. 🍁",
      craBody: "Nhân viên CRA thật sự không bao giờ đe dọa bắt giữ, yêu cầu thẻ quà tặng hay đòi thanh toán ngay. Nếu lo lắng về thuế, hãy gọi trực tiếp cho CRA: 1-800-959-8281. Bạn không gặp rắc rối gì.",
      debtTitle: "Bạn có quyền. Luật pháp Canada bảo vệ bạn. 🍁",
      debtBody: "Người đòi nợ không được đe dọa bạn, gọi trước 7 giờ sáng hoặc sau 9 giờ tối, hay liên hệ với chủ lao động của bạn. Bạn không phải đối mặt một mình.",
      teleTitle: "Mệt mỏi vì cuộc gọi làm phiền? Bạn có thể chặn hầu hết miễn phí.",
      teleBody: "Đăng ký số của bạn vào Danh sách Không Gọi của Canada (lnnte-dncl.gc.ca) — chỉ 2 phút, miễn phí.",
      spamTitle: "Đừng gọi lại. Đừng bấm bất kỳ phím nào.",
      spamBody: "Nếu cuộc gọi này khiến bạn lo lắng, bạn không đơn độc — hàng triệu người Canada nhận cuộc gọi lừa đảo mỗi năm. Hãy báo cáo bên dưới để bảo vệ người khác.",
    },
  },
};

export type AreaStrings = {
  title: string; // "[code]" placeholder
  description: string; // "[code]" placeholder
  summary: string; // "[region]" "[count]" "[type]" placeholders
  noNumbers: string; // "[code]" placeholder
  totalReports: string;
  otherAreaCodes: string;
  reports: string; // unit word, e.g. "reports"
  browseByAreaCode: string;
};

// Strings for the multilingual area-code pages and the homepage area grid.
// (Category names like Scam/Telemarketer stay English to match the badges.)
export const AREA_CONTENT: Record<string, AreaStrings> = {
  zh: { title: "[code] 区号的垃圾电话", description: "[code] 区号被举报的垃圾、诈骗和机器人电话号码。", summary: "[region] 地区的加拿大人已举报 [count] 个可疑号码。最常见的类型是 [type]。举报您接到的来电，帮助您的社区。", noNumbers: "[code] 区号暂无举报号码。", totalReports: "总举报数", otherAreaCodes: "其他区号", reports: "条举报", browseByAreaCode: "按区号浏览" },
  "zh-tw": { title: "[code] 區號的垃圾電話", description: "[code] 區號被舉報的垃圾、詐騙和機器人電話號碼。", summary: "[region] 地區的加拿大人已舉報 [count] 個可疑號碼。最常見的類型是 [type]。舉報您接到的來電，幫助您的社區。", noNumbers: "[code] 區號暫無舉報號碼。", totalReports: "總舉報數", otherAreaCodes: "其他區號", reports: "則舉報", browseByAreaCode: "按區號瀏覽" },
  pa: { title: "[code] ਏਰੀਆ ਕੋਡ ਦੀਆਂ ਸਪੈਮ ਕਾਲਾਂ", description: "[code] ਏਰੀਆ ਕੋਡ ਵਿੱਚ ਰਿਪੋਰਟ ਕੀਤੇ ਸਪੈਮ, ਧੋਖਾ ਅਤੇ ਰੋਬੋਕਾਲ ਨੰਬਰ।", summary: "[region] ਖੇਤਰ ਦੇ ਕੈਨੇਡੀਅਨਾਂ ਨੇ [count] ਸ਼ੱਕੀ ਨੰਬਰ ਰਿਪੋਰਟ ਕੀਤੇ ਹਨ। ਸਭ ਤੋਂ ਆਮ ਕਿਸਮ [type] ਹੈ। ਆਪਣੀਆਂ ਕਾਲਾਂ ਰਿਪੋਰਟ ਕਰਕੇ ਆਪਣੇ ਭਾਈਚਾਰੇ ਦੀ ਮਦਦ ਕਰੋ।", noNumbers: "[code] ਏਰੀਆ ਕੋਡ ਵਿੱਚ ਹਾਲੇ ਕੋਈ ਨੰਬਰ ਰਿਪੋਰਟ ਨਹੀਂ ਹੋਇਆ।", totalReports: "ਕੁੱਲ ਰਿਪੋਰਟਾਂ", otherAreaCodes: "ਹੋਰ ਏਰੀਆ ਕੋਡ", reports: "ਰਿਪੋਰਟਾਂ", browseByAreaCode: "ਏਰੀਆ ਕੋਡ ਅਨੁਸਾਰ ਵੇਖੋ" },
  tl: { title: "Mga spam call sa [code]", description: "Mga iniulat na spam, scam, at robocall na numero sa [code] area code.", summary: "Nag-ulat ang mga Canadian sa [region] ng [count] kahina-hinalang numero. Ang pinakakaraniwang uri ay [type]. Tulungan ang iyong komunidad sa pag-uulat ng mga tawag.", noNumbers: "Wala pang iniulat na numero sa [code] area code.", totalReports: "kabuuang ulat", otherAreaCodes: "Iba pang area code", reports: "ulat", browseByAreaCode: "Mag-browse ayon sa area code" },
  ar: { title: "مكالمات مزعجة من الرمز [code]", description: "أرقام مزعجة واحتيالية وآلية تم الإبلاغ عنها في رمز المنطقة [code].", summary: "أبلغ الكنديون في منطقة [region] عن [count] رقمًا مشبوهًا. النوع الأكثر شيوعًا هو [type]. ساعد مجتمعك بالإبلاغ عن المكالمات التي تتلقاها.", noNumbers: "لا توجد أرقام مُبلغ عنها في رمز المنطقة [code] بعد.", totalReports: "إجمالي البلاغات", otherAreaCodes: "رموز مناطق أخرى", reports: "بلاغات", browseByAreaCode: "تصفح حسب رمز المنطقة" },
  hi: { title: "[code] क्षेत्र कोड की स्पैम कॉल", description: "[code] क्षेत्र कोड में रिपोर्ट किए गए स्पैम, घोटाला और रोबोकॉल नंबर।", summary: "[region] क्षेत्र के कैनेडियनों ने [count] संदिग्ध नंबर रिपोर्ट किए हैं। सबसे आम प्रकार [type] है। अपनी कॉलों की रिपोर्ट करके अपने समुदाय की मदद करें।", noNumbers: "[code] क्षेत्र कोड में अभी कोई नंबर रिपोर्ट नहीं हुआ।", totalReports: "कुल रिपोर्ट", otherAreaCodes: "अन्य क्षेत्र कोड", reports: "रिपोर्ट", browseByAreaCode: "क्षेत्र कोड के अनुसार ब्राउज़ करें" },
  fr: { title: "Appels indésirables de l'indicatif [code]", description: "Numéros indésirables, frauduleux et robotisés signalés dans l'indicatif régional [code].", summary: "Les Canadiens de la région [region] ont signalé [count] numéros suspects. Le type le plus courant est [type]. Aidez votre communauté en signalant les appels que vous recevez.", noNumbers: "Aucun numéro signalé dans l'indicatif [code] pour l'instant.", totalReports: "signalements au total", otherAreaCodes: "Autres indicatifs", reports: "signalements", browseByAreaCode: "Parcourir par indicatif" },
  es: { title: "Llamadas spam del código [code]", description: "Números de spam, estafa y robollamadas reportados en el código de área [code].", summary: "Los canadienses de la zona [region] han reportado [count] números sospechosos. El tipo más común es [type]. Ayuda a tu comunidad reportando las llamadas que recibes.", noNumbers: "Aún no hay números reportados en el código de área [code].", totalReports: "reportes en total", otherAreaCodes: "Otros códigos de área", reports: "reportes", browseByAreaCode: "Explorar por código de área" },
  ko: { title: "[code] 지역번호 스팸 전화", description: "[code] 지역번호에서 신고된 스팸, 사기, 로보콜 번호.", summary: "[region] 지역의 캐나다인들이 [count]개의 의심스러운 번호를 신고했습니다. 가장 흔한 유형은 [type]입니다. 받은 전화를 신고하여 커뮤니티를 도와주세요.", noNumbers: "[code] 지역번호에서 아직 신고된 번호가 없습니다.", totalReports: "총 신고 수", otherAreaCodes: "다른 지역번호", reports: "건 신고", browseByAreaCode: "지역번호로 찾아보기" },
  vi: { title: "Cuộc gọi rác từ mã vùng [code]", description: "Các số rác, lừa đảo và robocall được báo cáo trong mã vùng [code].", summary: "Người Canada ở khu vực [region] đã báo cáo [count] số đáng ngờ. Loại phổ biến nhất là [type]. Hãy giúp cộng đồng bằng cách báo cáo các cuộc gọi bạn nhận được.", noNumbers: "Chưa có số nào được báo cáo trong mã vùng [code].", totalReports: "tổng số báo cáo", otherAreaCodes: "Mã vùng khác", reports: "báo cáo", browseByAreaCode: "Duyệt theo mã vùng" },
};

