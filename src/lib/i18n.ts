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
