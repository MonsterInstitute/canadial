// Translations of the "Know Your Rights" page for every non-English locale.
// Phone numbers are kept in English/literal form (e.g. 1-800-959-8281) and the
// lnnte-dncl.gc.ca URL is linkified at render time. French and Spanish are
// polished; other languages are kept simple and clear.
// NOTE: safety/legal copy — native-speaker review recommended.

export type RightsContent = {
  pageTitle: string;
  pageDescription: string;
  intro: string;
  craSection: {
    title: string;
    intro: string;
    tableHeaders: [string, string]; // [real CRA agent, scammer]
    tableRows: [string, string][]; // each [real, scammer]
    neverTitle: string;
    neverList: string[];
    whatToDoTitle: string;
    whatToDo: string[];
    closing: string;
  };
  debtSection: {
    title: string;
    intro: string;
    rightsTitle: string;
    rightsList: string[];
    cannotTitle: string;
    cannotList: string[];
    reportInfo: string;
  };
  dncSection: {
    title: string;
    body: string;
  };
  scammedSection: {
    title: string;
    intro: string; // reassurance box
    stepsTitle: string;
    stepsList: string[];
  };
  lookupCta: {
    text: string;
    button: string;
  };
};

export const RIGHTS_CONTENT: Record<string, RightsContent> = {
  zh: {
    pageTitle: "了解您的权利",
    pageDescription:
      "在加拿大接到可疑电话时该怎么做。免费指南：识别 CRA（税务局）诈骗、了解催债人的限制、屏蔽推销电话。",
    intro:
      "每天都有数百万加拿大人接到旨在恐吓他们的电话。骗子知道很多人担心税务、债务或移民身份——他们正是利用这种恐惧来对付您。本指南将帮助您了解自己的权利，并清楚地知道该怎么做。",
    craSection: {
      title: "有人来电自称是加拿大税务局（CRA）",
      intro:
        "来自加拿大税务局的真实电话与诈骗电话非常不同。以下是区分它们的方法。",
      tableHeaders: ["真正的 CRA 人员", "骗子"],
      tableRows: [
        ["在来电之前，会先寄信通知您", "突然来电，并制造紧迫感"],
        ["态度平和，允许您核实其身份", "用逮捕、遣返或报警来威胁您"],
        [
          "接受正常、可追踪的付款方式",
          "要求用礼品卡、电子转账、加密货币或比特币付款",
        ],
        ["绝不会催您在几分钟内行动", "说您必须立即付款，否则承担后果"],
      ],
      neverTitle: "加拿大税务局（CRA）绝不会：",
      neverList: [
        "威胁立即逮捕您或派警察上门",
        "要求用礼品卡、加密货币或电子转账付款",
        "在电话中索要您的社保号（SIN）、护照或银行信息",
        "使用激烈或威胁性的语言来恐吓您",
      ],
      whatToDoTitle: "该怎么做：",
      whatToDo: [
        "挂断电话。您完全可以直接结束通话。",
        "深呼吸。挂断电话不会带来任何坏事。",
        "如果想确认，请直接致电 CRA：1-800-959-8281。",
      ],
      closing:
        "您没有惹上麻烦。真正的税务问题总是先通过邮寄信件处理，绝不会用突如其来的电话。",
    },
    debtSection: {
      title: "催债公司给我打电话",
      intro:
        "面对债务本就让人压力重重。您理应受到有尊严的对待，而且法律站在您这一边。",
      rightsTitle: "您的权利：",
      rightsList: [
        "您有权受到尊重的对待，不受威胁",
        "您可以要求对方出示证明，确认这笔债务确实属于您",
        "您可以要求催债人只通过书面方式与您联系",
      ],
      cannotTitle: "催债人不得：",
      cannotList: [
        "威胁、恐吓或使用辱骂性语言",
        "在早上7点之前或晚上9点之后致电",
        "就您的债务联系您的雇主、家人或朋友",
        "频繁致电，以至于构成骚扰",
      ],
      reportInfo:
        "您不必独自面对。如需举报不当行为，请联系加拿大金融消费者管理局（FCAC）：1-866-461-3222。",
    },
    dncSection: {
      title: "我总是接到推销电话",
      body: "您可以免费阻止大部分不想要的推销电话，只需将您的号码加入加拿大的全国“谢绝来电名单”。大约需要两分钟。在 lnnte-dncl.gc.ca 在线登记，或致电 1-866-580-3625 登记。",
    },
    scammedSection: {
      title: "我觉得我被骗了",
      intro: "没关系。骗子是操纵人心的专业高手。这不是您的错。",
      stepsTitle: "应采取的步骤：",
      stepsList: [
        "如果您泄露了银行信息，请立即致电您的银行以保护您的账户。",
        "记下经过——号码、时间，以及对方说了什么。",
        "向加拿大反欺诈中心举报：1-888-495-8501。",
        "如果您损失了钱财，也请向您当地的警察部门报案。",
      ],
    },
    lookupCta: {
      text: "接到不确定的电话？查一查并举报，帮助保护他人。",
      button: "查询号码",
    },
  },

  "zh-tw": {
    pageTitle: "了解您的權利",
    pageDescription:
      "在加拿大接到可疑電話時該怎麼做。免費指南：辨識 CRA（稅務局）詐騙、了解討債人的限制、封鎖推銷電話。",
    intro:
      "每天都有數百萬加拿大人接到旨在恐嚇他們的電話。騙徒知道許多人擔心稅務、債務或移民身分——他們正是利用這種恐懼來對付您。本指南將幫助您了解自己的權利，並清楚知道該怎麼做。",
    craSection: {
      title: "有人來電自稱是加拿大稅務局（CRA）",
      intro:
        "來自加拿大稅務局的真實電話與詐騙電話非常不同。以下是分辨它們的方法。",
      tableHeaders: ["真正的 CRA 人員", "騙徒"],
      tableRows: [
        ["在來電之前，會先寄信通知您", "突然來電，並製造緊迫感"],
        ["態度平和，允許您核實其身分", "以逮捕、遣返或報警來威脅您"],
        [
          "接受正常、可追蹤的付款方式",
          "要求以禮品卡、電子轉帳、加密貨幣或比特幣付款",
        ],
        ["絕不會催您在幾分鐘內行動", "說您必須立即付款，否則承擔後果"],
      ],
      neverTitle: "加拿大稅務局（CRA）絕不會：",
      neverList: [
        "威脅立即逮捕您或派警察上門",
        "要求以禮品卡、加密貨幣或電子轉帳付款",
        "在電話中索取您的社會保險號（SIN）、護照或銀行資料",
        "使用激烈或威脅性的言語來恐嚇您",
      ],
      whatToDoTitle: "該怎麼做：",
      whatToDo: [
        "掛斷電話。您完全可以直接結束通話。",
        "深呼吸。掛斷電話不會帶來任何壞事。",
        "若想確認，請直接致電 CRA：1-800-959-8281。",
      ],
      closing:
        "您並沒有惹上麻煩。真正的稅務問題總是先以郵寄信件處理，絕不會用突如其來的電話。",
    },
    debtSection: {
      title: "討債公司打電話給我",
      intro:
        "面對債務本就讓人倍感壓力。您理應受到有尊嚴的對待，而且法律站在您這一邊。",
      rightsTitle: "您的權利：",
      rightsList: [
        "您有權受到尊重的對待，不受威脅",
        "您可以要求對方出示證明，確認這筆債務確實屬於您",
        "您可以要求討債人只以書面方式與您聯絡",
      ],
      cannotTitle: "討債人不得：",
      cannotList: [
        "威脅、恐嚇或使用辱罵性言語",
        "在早上7點之前或晚上9點之後致電",
        "就您的債務聯絡您的僱主、家人或朋友",
        "頻繁致電，以致構成騷擾",
      ],
      reportInfo:
        "您不必獨自面對。如需舉報不當行為，請聯絡加拿大金融消費者管理局（FCAC）：1-866-461-3222。",
    },
    dncSection: {
      title: "我一直接到推銷電話",
      body: "您可以免費阻擋大部分不想要的推銷電話，只需將您的號碼加入加拿大的全國「謝絕來電名單」。大約需要兩分鐘。在 lnnte-dncl.gc.ca 線上登記，或致電 1-866-580-3625 登記。",
    },
    scammedSection: {
      title: "我覺得我被騙了",
      intro: "沒關係。騙徒是操縱人心的專業高手。這不是您的錯。",
      stepsTitle: "應採取的步驟：",
      stepsList: [
        "如果您洩露了銀行資料，請立即致電您的銀行以保護您的帳戶。",
        "記下經過——號碼、時間，以及對方說了什麼。",
        "向加拿大反詐騙中心舉報：1-888-495-8501。",
        "如果您損失了金錢，也請向您當地的警察部門報案。",
      ],
    },
    lookupCta: {
      text: "接到不確定的電話？查一查並舉報，幫助保護他人。",
      button: "查詢號碼",
    },
  },

  pa: {
    pageTitle: "ਆਪਣੇ ਹੱਕ ਜਾਣੋ",
    pageDescription:
      "ਕੈਨੇਡਾ ਵਿੱਚ ਸ਼ੱਕੀ ਕਾਲ ਆਉਣ 'ਤੇ ਕੀ ਕਰਨਾ ਹੈ। CRA ਧੋਖੇ, ਕਰਜ਼ਾ ਵਸੂਲਣ ਵਾਲਿਆਂ ਦੇ ਹੱਕ, ਅਤੇ ਪਰੇਸ਼ਾਨ ਕਰਨ ਵਾਲੀਆਂ ਕਾਲਾਂ ਰੋਕਣ ਬਾਰੇ ਮੁਫ਼ਤ ਗਾਈਡ।",
    intro:
      "ਹਰ ਰੋਜ਼ ਲੱਖਾਂ ਕੈਨੇਡੀਅਨਾਂ ਨੂੰ ਡਰਾਉਣ ਲਈ ਕਾਲਾਂ ਆਉਂਦੀਆਂ ਹਨ। ਠੱਗ ਜਾਣਦੇ ਹਨ ਕਿ ਬਹੁਤ ਸਾਰੇ ਲੋਕ ਟੈਕਸ, ਕਰਜ਼ੇ ਜਾਂ ਇਮੀਗ੍ਰੇਸ਼ਨ ਬਾਰੇ ਚਿੰਤਤ ਰਹਿੰਦੇ ਹਨ — ਅਤੇ ਉਹ ਇਸੇ ਡਰ ਦਾ ਫ਼ਾਇਦਾ ਉਠਾਉਂਦੇ ਹਨ। ਇਹ ਗਾਈਡ ਤੁਹਾਨੂੰ ਆਪਣੇ ਹੱਕ ਸਮਝਣ ਅਤੇ ਇਹ ਜਾਣਨ ਵਿੱਚ ਮਦਦ ਕਰੇਗੀ ਕਿ ਠੀਕ ਕੀ ਕਰਨਾ ਹੈ।",
    craSection: {
      title: "ਕਿਸੇ ਨੇ CRA (ਟੈਕਸ ਵਿਭਾਗ) ਬਣ ਕੇ ਕਾਲ ਕੀਤੀ",
      intro:
        "CRA ਦੀ ਅਸਲੀ ਕਾਲ ਧੋਖੇ ਵਾਲੀ ਕਾਲ ਤੋਂ ਬਹੁਤ ਵੱਖਰੀ ਹੁੰਦੀ ਹੈ। ਇਨ੍ਹਾਂ ਨੂੰ ਇੰਝ ਪਛਾਣੋ।",
      tableHeaders: ["ਅਸਲੀ CRA ਅਫ਼ਸਰ", "ਠੱਗ"],
      tableRows: [
        ["ਕਾਲ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਡਾਕ ਰਾਹੀਂ ਚਿੱਠੀ ਭੇਜਦਾ ਹੈ", "ਅਚਾਨਕ ਕਾਲ ਕਰਕੇ ਜਲਦਬਾਜ਼ੀ ਪੈਦਾ ਕਰਦਾ ਹੈ"],
        ["ਸ਼ਾਂਤ ਰਹਿੰਦਾ ਹੈ ਅਤੇ ਤੁਹਾਨੂੰ ਪਛਾਣ ਪਰਖਣ ਦਿੰਦਾ ਹੈ", "ਗ੍ਰਿਫ਼ਤਾਰੀ, ਡਿਪੋਰਟ ਜਾਂ ਪੁਲਿਸ ਦਾ ਡਰਾਵਾ ਦਿੰਦਾ ਹੈ"],
        ["ਆਮ, ਟ੍ਰੇਸ ਹੋਣ ਵਾਲੇ ਭੁਗਤਾਨ ਤਰੀਕੇ ਮੰਨਦਾ ਹੈ", "ਗਿਫ਼ਟ ਕਾਰਡ, ਈ-ਟ੍ਰਾਂਸਫ਼ਰ, ਕ੍ਰਿਪਟੋ ਜਾਂ ਬਿਟਕੋਇਨ ਮੰਗਦਾ ਹੈ"],
        ["ਕਦੇ ਵੀ ਕੁਝ ਮਿੰਟਾਂ ਵਿੱਚ ਕਾਰਵਾਈ ਲਈ ਦਬਾਅ ਨਹੀਂ ਪਾਉਂਦਾ", "ਕਹਿੰਦਾ ਹੈ ਕਿ ਹੁਣੇ ਭੁਗਤਾਨ ਕਰੋ ਨਹੀਂ ਤਾਂ ਨਤੀਜੇ ਭੁਗਤੋ"],
      ],
      neverTitle: "CRA ਕਦੇ ਵੀ ਇਹ ਨਹੀਂ ਕਰੇਗਾ:",
      neverList: [
        "ਤੁਰੰਤ ਗ੍ਰਿਫ਼ਤਾਰੀ ਦੀ ਧਮਕੀ ਦੇਣਾ ਜਾਂ ਪੁਲਿਸ ਭੇਜਣਾ",
        "ਗਿਫ਼ਟ ਕਾਰਡ, ਕ੍ਰਿਪਟੋਕਰੰਸੀ ਜਾਂ ਈ-ਟ੍ਰਾਂਸਫ਼ਰ ਰਾਹੀਂ ਭੁਗਤਾਨ ਮੰਗਣਾ",
        "ਫ਼ੋਨ 'ਤੇ ਤੁਹਾਡਾ SIN, ਪਾਸਪੋਰਟ ਜਾਂ ਬੈਂਕ ਜਾਣਕਾਰੀ ਮੰਗਣਾ",
        "ਤੁਹਾਨੂੰ ਡਰਾਉਣ ਲਈ ਸਖ਼ਤ ਜਾਂ ਧਮਕੀ ਭਰੀ ਭਾਸ਼ਾ ਵਰਤਣਾ",
      ],
      whatToDoTitle: "ਕੀ ਕਰਨਾ ਹੈ:",
      whatToDo: [
        "ਫ਼ੋਨ ਕੱਟ ਦਿਓ। ਤੁਸੀਂ ਕਾਲ ਖ਼ਤਮ ਕਰ ਸਕਦੇ ਹੋ।",
        "ਸਾਹ ਲਓ। ਫ਼ੋਨ ਕੱਟਣ ਨਾਲ ਕੁਝ ਬੁਰਾ ਨਹੀਂ ਹੁੰਦਾ।",
        "ਪੱਕਾ ਕਰਨ ਲਈ, ਸਿੱਧਾ CRA ਨੂੰ ਕਾਲ ਕਰੋ: 1-800-959-8281।",
      ],
      closing:
        "ਤੁਸੀਂ ਕਿਸੇ ਮੁਸੀਬਤ ਵਿੱਚ ਨਹੀਂ ਹੋ। ਅਸਲੀ ਟੈਕਸ ਮਾਮਲੇ ਪਹਿਲਾਂ ਡਾਕ ਰਾਹੀਂ ਨਿਪਟਾਏ ਜਾਂਦੇ ਹਨ, ਕਦੇ ਵੀ ਅਚਾਨਕ ਫ਼ੋਨ ਕਾਲ ਨਾਲ ਨਹੀਂ।",
    },
    debtSection: {
      title: "ਕਰਜ਼ਾ ਵਸੂਲਣ ਵਾਲੇ ਨੇ ਮੈਨੂੰ ਕਾਲ ਕੀਤੀ",
      intro:
        "ਕਰਜ਼ੇ ਨਾਲ ਨਜਿੱਠਣਾ ਪਹਿਲਾਂ ਹੀ ਤਣਾਅ ਭਰਿਆ ਹੁੰਦਾ ਹੈ। ਤੁਹਾਡੇ ਨਾਲ ਇੱਜ਼ਤ ਨਾਲ ਪੇਸ਼ ਆਉਣਾ ਚਾਹੀਦਾ ਹੈ, ਅਤੇ ਕਾਨੂੰਨ ਤੁਹਾਡੇ ਨਾਲ ਹੈ।",
      rightsTitle: "ਤੁਹਾਡੇ ਹੱਕ:",
      rightsList: [
        "ਤੁਹਾਨੂੰ ਬਿਨਾਂ ਧਮਕੀ ਦੇ, ਇੱਜ਼ਤ ਨਾਲ ਪੇਸ਼ ਆਉਣ ਦਾ ਹੱਕ ਹੈ",
        "ਤੁਸੀਂ ਸਬੂਤ ਮੰਗ ਸਕਦੇ ਹੋ ਕਿ ਕਰਜ਼ਾ ਸੱਚਮੁੱਚ ਤੁਹਾਡਾ ਹੈ",
        "ਤੁਸੀਂ ਕਹਿ ਸਕਦੇ ਹੋ ਕਿ ਉਹ ਸਿਰਫ਼ ਲਿਖਤੀ ਰੂਪ ਵਿੱਚ ਸੰਪਰਕ ਕਰਨ",
      ],
      cannotTitle: "ਵਸੂਲਣ ਵਾਲਾ ਇਹ ਨਹੀਂ ਕਰ ਸਕਦਾ:",
      cannotList: [
        "ਧਮਕਾਉਣਾ, ਡਰਾਉਣਾ ਜਾਂ ਗਾਲ੍ਹਾਂ ਵਾਲੀ ਭਾਸ਼ਾ ਵਰਤਣਾ",
        "ਸਵੇਰੇ 7 ਵਜੇ ਤੋਂ ਪਹਿਲਾਂ ਜਾਂ ਰਾਤ 9 ਵਜੇ ਤੋਂ ਬਾਅਦ ਕਾਲ ਕਰਨਾ",
        "ਤੁਹਾਡੇ ਕਰਜ਼ੇ ਬਾਰੇ ਤੁਹਾਡੇ ਮਾਲਕ, ਪਰਿਵਾਰ ਜਾਂ ਦੋਸਤਾਂ ਨਾਲ ਸੰਪਰਕ ਕਰਨਾ",
        "ਇੰਨੀ ਵਾਰ ਕਾਲ ਕਰਨਾ ਕਿ ਇਹ ਪਰੇਸ਼ਾਨੀ ਬਣ ਜਾਵੇ",
      ],
      reportInfo:
        "ਤੁਹਾਨੂੰ ਇਕੱਲੇ ਇਸ ਦਾ ਸਾਹਮਣਾ ਨਹੀਂ ਕਰਨਾ ਪੈਂਦਾ। ਬਦਸਲੂਕੀ ਦੀ ਰਿਪੋਰਟ ਕਰਨ ਲਈ, Financial Consumer Agency of Canada ਨਾਲ ਸੰਪਰਕ ਕਰੋ: 1-866-461-3222।",
    },
    dncSection: {
      title: "ਮੈਨੂੰ ਵਾਰ-ਵਾਰ ਵੇਚਣ ਵਾਲੀਆਂ ਕਾਲਾਂ ਆਉਂਦੀਆਂ ਹਨ",
      body: "ਤੁਸੀਂ ਆਪਣਾ ਨੰਬਰ ਕੈਨੇਡਾ ਦੀ National Do Not Call List ਵਿੱਚ ਪਾ ਕੇ ਜ਼ਿਆਦਾਤਰ ਅਣਚਾਹੀਆਂ ਟੈਲੀਮਾਰਕੀਟਿੰਗ ਕਾਲਾਂ ਮੁਫ਼ਤ ਰੋਕ ਸਕਦੇ ਹੋ। ਇਸ ਵਿੱਚ ਲਗਭਗ ਦੋ ਮਿੰਟ ਲੱਗਦੇ ਹਨ। lnnte-dncl.gc.ca 'ਤੇ ਆਨਲਾਈਨ ਰਜਿਸਟਰ ਕਰੋ, ਜਾਂ ਫ਼ੋਨ ਰਾਹੀਂ 1-866-580-3625 'ਤੇ ਰਜਿਸਟਰ ਕਰੋ।",
    },
    scammedSection: {
      title: "ਮੈਨੂੰ ਲੱਗਦਾ ਹੈ ਮੇਰੇ ਨਾਲ ਠੱਗੀ ਹੋਈ ਹੈ",
      intro: "ਕੋਈ ਗੱਲ ਨਹੀਂ। ਠੱਗ ਲੋਕਾਂ ਨੂੰ ਬਹਿਕਾਉਣ ਦੇ ਮਾਹਰ ਹੁੰਦੇ ਹਨ। ਇਹ ਤੁਹਾਡੀ ਗ਼ਲਤੀ ਨਹੀਂ ਹੈ।",
      stepsTitle: "ਚੁੱਕਣ ਵਾਲੇ ਕਦਮ:",
      stepsList: [
        "ਜੇ ਤੁਸੀਂ ਬੈਂਕ ਜਾਣਕਾਰੀ ਸਾਂਝੀ ਕੀਤੀ ਹੈ, ਤਾਂ ਆਪਣੇ ਖਾਤੇ ਬਚਾਉਣ ਲਈ ਤੁਰੰਤ ਆਪਣੇ ਬੈਂਕ ਨੂੰ ਕਾਲ ਕਰੋ।",
        "ਜੋ ਹੋਇਆ ਉਹ ਲਿਖ ਲਓ — ਨੰਬਰ, ਸਮਾਂ, ਅਤੇ ਕੀ ਕਿਹਾ ਗਿਆ।",
        "ਇਸ ਦੀ ਰਿਪੋਰਟ Canadian Anti-Fraud Centre ਨੂੰ ਕਰੋ: 1-888-495-8501।",
        "ਜੇ ਤੁਹਾਡੇ ਪੈਸੇ ਗਏ ਹਨ, ਤਾਂ ਆਪਣੀ ਸਥਾਨਕ ਪੁਲਿਸ ਨੂੰ ਵੀ ਰਿਪੋਰਟ ਕਰੋ।",
      ],
    },
    lookupCta: {
      text: "ਕਿਸੇ ਕਾਲ ਬਾਰੇ ਸ਼ੱਕ ਹੈ? ਉਸ ਨੂੰ ਲੱਭੋ ਅਤੇ ਰਿਪੋਰਟ ਕਰੋ ਤਾਂ ਜੋ ਹੋਰਾਂ ਦੀ ਰਾਖੀ ਹੋ ਸਕੇ।",
      button: "ਨੰਬਰ ਲੱਭੋ",
    },
  },

  tl: {
    pageTitle: "Alamin ang Iyong mga Karapatan",
    pageDescription:
      "Ano ang gagawin kapag nakatanggap ka ng kahina-hinalang tawag sa Canada. Libreng gabay sa mga CRA scam, karapatan laban sa mga collector, at pagharang sa telemarketer.",
    intro:
      "Araw-araw, milyon-milyong Canadian ang tumatanggap ng mga tawag na sadyang ginawa para takutin sila. Alam ng mga scammer na marami ang nag-aalala tungkol sa buwis, utang, o katayuan sa imigrasyon — at ginagamit nila ito laban sa iyo. Layunin ng gabay na ito na matulungan kang maunawaan ang iyong mga karapatan at malaman kung ano talaga ang dapat gawin.",
    craSection: {
      title: "May tumawag na nagpanggap na CRA",
      intro:
        "Ibang-iba ang tunay na tawag mula sa Canada Revenue Agency kaysa sa isang scam. Ganito mo sila makikilala.",
      tableHeaders: ["Tunay na ahente ng CRA", "Isang scammer"],
      tableRows: [
        ["Nagpapadala muna ng sulat bago tumawag", "Biglang tumatawag at nagmamadali sa iyo"],
        ["Kalmado at hinahayaan kang i-verify ang kanilang pagkakakilanlan", "Tinatakot ka ng pag-aresto, deportasyon, o pulis"],
        ["Tumatanggap ng normal at natutunton na paraan ng pagbabayad", "Humihingi ng gift card, e-transfer, crypto, o Bitcoin"],
        ["Hindi ka kailanman pinipilit na kumilos agad", "Sinasabing magbayad ka agad o may mangyayari"],
      ],
      neverTitle: "Hindi kailanman gagawin ng CRA:",
      neverList: [
        "Takutin ka ng agarang pag-aresto o magpadala ng pulis",
        "Humingi ng bayad gamit ang gift card, cryptocurrency, o e-transfer",
        "Hingin ang iyong SIN, pasaporte, o detalye ng bangko sa telepono",
        "Gumamit ng nananakot o agresibong pananalita para takutin ka",
      ],
      whatToDoTitle: "Ano ang gagawin:",
      whatToDo: [
        "Ibaba ang telepono. Puwede mong tapusin ang tawag.",
        "Huminga ka. Walang masamang mangyayari dahil ibinaba mo.",
        "Para makasigurado, tumawag mismo sa CRA: 1-800-959-8281.",
      ],
      closing:
        "Wala kang problema. Ang tunay na usapin sa buwis ay hinahawakan muna sa pamamagitan ng sulat, hindi sa biglaang tawag.",
    },
    debtSection: {
      title: "May tumawag na collector",
      intro:
        "Sapat nang nakaka-stress ang pagharap sa utang. Karapat-dapat kang tratuhin nang may dignidad, at nasa panig mo ang batas.",
      rightsTitle: "Ang iyong mga karapatan:",
      rightsList: [
        "May karapatan kang tratuhin nang magalang, walang banta",
        "Maaari kang humingi ng patunay na sa iyo talaga ang utang",
        "Maaari mong hilingin na sa sulat lang sila makipag-ugnayan",
      ],
      cannotTitle: "Hindi maaaring gawin ng collector:",
      cannotList: [
        "Magbanta, manakot, o gumamit ng masamang pananalita",
        "Tumawag bago mag-7:00 a.m. o pagkatapos ng 9:00 p.m.",
        "Makipag-ugnayan sa iyong amo, pamilya, o mga kaibigan tungkol sa utang mo",
        "Tumawag nang madalas hanggang maging panliligalig na",
      ],
      reportInfo:
        "Hindi mo ito kailangang harapin nang mag-isa. Para mag-ulat ng pang-aabuso, makipag-ugnayan sa Financial Consumer Agency of Canada: 1-866-461-3222.",
    },
    dncSection: {
      title: "Paulit-ulit akong tinatawagan ng benta",
      body: "Mapipigilan mo nang libre ang karamihan sa mga hindi gustong tawag ng telemarketer sa pamamagitan ng pagdaragdag ng iyong numero sa National Do Not Call List ng Canada. Mga dalawang minuto lang ito. Magrehistro online sa lnnte-dncl.gc.ca, o magrehistro sa telepono sa 1-866-580-3625.",
    },
    scammedSection: {
      title: "Sa tingin ko ay na-scam ako",
      intro: "Okay lang. Eksperto ang mga scammer sa panloloko. Hindi ito kasalanan mo.",
      stepsTitle: "Mga hakbang na gagawin:",
      stepsList: [
        "Kung nagbahagi ka ng detalye ng bangko, tawagan agad ang iyong bangko para protektahan ang iyong account.",
        "Isulat ang nangyari — ang numero, ang oras, at ang sinabi.",
        "Iulat ito sa Canadian Anti-Fraud Centre: 1-888-495-8501.",
        "Kung nawalan ka ng pera, iulat din ito sa lokal na pulisya.",
      ],
    },
    lookupCta: {
      text: "May tawag ka bang hindi sigurado? Hanapin ito at iulat para maprotektahan ang iba.",
      button: "Maghanap ng numero",
    },
  },

  ar: {
    pageTitle: "اعرف حقوقك",
    pageDescription:
      "ماذا تفعل عند تلقّي مكالمة مشبوهة في كندا. دليل مجاني حول احتيال CRA وحقوقك أمام محصّلي الديون وحظر مكالمات التسويق.",
    intro:
      "كل يوم يتلقّى ملايين الكنديين مكالمات هدفها تخويفهم. يعرف المحتالون أن كثيرين قلقون بشأن الضرائب أو الديون أو وضع الهجرة — ويستغلّون هذا الخوف ضدّك. هذا الدليل يساعدك على فهم حقوقك ومعرفة ما عليك فعله بالضبط.",
    craSection: {
      title: "اتصل بك شخص يدّعي أنه من CRA",
      intro:
        "تختلف المكالمة الحقيقية من وكالة الإيرادات الكندية كثيرًا عن الاحتيال. وإليك كيف تميّز بينهما.",
      tableHeaders: ["موظّف CRA حقيقي", "محتال"],
      tableRows: [
        ["يرسل رسالة بالبريد أولًا قبل أي اتصال", "يتصل فجأة ويخلق شعورًا بالاستعجال"],
        ["يكون هادئًا ويتيح لك التحقق من هويته", "يهدّدك بالاعتقال أو الترحيل أو الشرطة"],
        ["يقبل وسائل دفع عادية يمكن تتبّعها", "يطلب بطاقات هدايا أو تحويلًا إلكترونيًا أو عملة مشفّرة أو بيتكوين"],
        ["لا يضغط عليك أبدًا للتصرّف خلال دقائق", "يقول إنه يجب أن تدفع فورًا وإلا واجهت العواقب"],
      ],
      neverTitle: "لن تقوم CRA أبدًا بما يلي:",
      neverList: [
        "تهديدك بالاعتقال الفوري أو إرسال الشرطة",
        "طلب الدفع ببطاقات الهدايا أو العملات المشفّرة أو التحويل الإلكتروني",
        "طلب رقم التأمين الاجتماعي (SIN) أو جواز سفرك أو تفاصيل حسابك المصرفي عبر الهاتف",
        "استخدام لغة عدوانية أو تهديدية لإخافتك",
      ],
      whatToDoTitle: "ما عليك فعله:",
      whatToDo: [
        "أغلق الخط. يحقّ لك ببساطة إنهاء المكالمة.",
        "خذ نفسًا. لا يحدث أي شيء سيّئ لأنك أغلقت الخط.",
        "إن أردت التأكّد، اتصل مباشرة بـ CRA على الرقم 1-800-959-8281.",
      ],
      closing:
        "أنت لست في ورطة. المسائل الضريبية الحقيقية تُعالَج بالبريد أولًا، وليس بمكالمات هاتفية مفاجئة.",
    },
    debtSection: {
      title: "اتصل بي محصّل ديون",
      intro:
        "التعامل مع الديون مرهق بما يكفي. تستحق أن تُعامَل بكرامة، والقانون في صفّك.",
      rightsTitle: "حقوقك:",
      rightsList: [
        "لك الحق في أن تُعامَل باحترام ودون تهديد",
        "يمكنك طلب إثبات أن الدَّين يخصّك فعلًا",
        "يمكنك أن تطلب من المحصّل التواصل معك كتابةً فقط",
      ],
      cannotTitle: "لا يجوز للمحصّل أن:",
      cannotList: [
        "يهدّد أو يخيف أو يستخدم لغة مسيئة",
        "يتصل قبل السابعة صباحًا أو بعد التاسعة مساءً",
        "يتواصل مع صاحب عملك أو عائلتك أو أصدقائك بشأن دَينك",
        "يتصل بكثرة إلى حدّ المضايقة",
      ],
      reportInfo:
        "لست مضطرًا لمواجهة هذا وحدك. للإبلاغ عن إساءة، تواصل مع Financial Consumer Agency of Canada على الرقم 1-866-461-3222.",
    },
    dncSection: {
      title: "تصلني مكالمات بيع باستمرار",
      body: "يمكنك إيقاف معظم مكالمات التسويق غير المرغوبة مجانًا بإضافة رقمك إلى قائمة عدم الاتصال الوطنية في كندا. يستغرق ذلك نحو دقيقتين. سجّل عبر الإنترنت على lnnte-dncl.gc.ca، أو سجّل عبر الهاتف على الرقم 1-866-580-3625.",
    },
    scammedSection: {
      title: "أعتقد أنني تعرّضت للاحتيال",
      intro: "لا بأس. المحتالون محترفون في التلاعب. هذا ليس خطأك.",
      stepsTitle: "الخطوات التي ينبغي اتخاذها:",
      stepsList: [
        "إذا شاركت تفاصيل حسابك المصرفي، فاتصل بمصرفك فورًا لحماية حساباتك.",
        "دوّن ما حدث — الرقم والوقت وما قيل.",
        "أبلغ عنه لدى Canadian Anti-Fraud Centre على الرقم 1-888-495-8501.",
        "إذا خسرت مالًا، فأبلغ أيضًا شرطتك المحلية.",
      ],
    },
    lookupCta: {
      text: "هل وصلتك مكالمة لست متأكدًا منها؟ ابحث عنها وأبلغ عنها لحماية الآخرين.",
      button: "ابحث عن رقم",
    },
  },

  hi: {
    pageTitle: "अपने अधिकार जानें",
    pageDescription:
      "कनाडा में संदिग्ध कॉल आने पर क्या करें। CRA घोटालों, वसूली एजेंटों के विरुद्ध आपके अधिकारों, और टेलीमार्केटिंग कॉल रोकने पर मुफ़्त गाइड।",
    intro:
      "हर दिन लाखों कैनेडियन ऐसी कॉल पाते हैं जो उन्हें डराने के लिए बनाई जाती हैं। ठग जानते हैं कि बहुत-से लोग टैक्स, कर्ज़ या इमिग्रेशन स्टेटस को लेकर चिंतित रहते हैं — और वे इसी डर का इस्तेमाल आपके ख़िलाफ़ करते हैं। यह गाइड आपको अपने अधिकार समझने और यह जानने में मदद करेगी कि ठीक क्या करना है।",
    craSection: {
      title: "किसी ने CRA (टैक्स विभाग) बनकर कॉल किया",
      intro:
        "Canada Revenue Agency की असली कॉल घोटाले वाली कॉल से बहुत अलग होती है। इन्हें ऐसे पहचानें।",
      tableHeaders: ["असली CRA अधिकारी", "ठग"],
      tableRows: [
        ["कॉल करने से पहले डाक से पत्र भेजता है", "अचानक कॉल करके जल्दबाज़ी पैदा करता है"],
        ["शांत रहता है और आपको पहचान जाँचने देता है", "गिरफ़्तारी, डिपोर्ट या पुलिस का डर दिखाता है"],
        ["सामान्य, ट्रैक होने वाले भुगतान तरीके स्वीकार करता है", "गिफ़्ट कार्ड, ई-ट्रांसफ़र, क्रिप्टो या बिटकॉइन माँगता है"],
        ["कभी कुछ मिनटों में कार्रवाई के लिए दबाव नहीं डालता", "कहता है अभी भुगतान करो वरना अंजाम भुगतो"],
      ],
      neverTitle: "CRA कभी ये नहीं करेगा:",
      neverList: [
        "तुरंत गिरफ़्तारी की धमकी देना या पुलिस भेजना",
        "गिफ़्ट कार्ड, क्रिप्टोकरेंसी या ई-ट्रांसफ़र से भुगतान माँगना",
        "फ़ोन पर आपका SIN, पासपोर्ट या बैंक जानकारी माँगना",
        "आपको डराने के लिए आक्रामक या धमकी भरी भाषा का इस्तेमाल करना",
      ],
      whatToDoTitle: "क्या करें:",
      whatToDo: [
        "फ़ोन काट दें। आप कॉल को बस समाप्त कर सकते हैं।",
        "एक साँस लें। फ़ोन काटने से कुछ बुरा नहीं होता।",
        "पक्का करने के लिए, सीधे CRA को कॉल करें: 1-800-959-8281।",
      ],
      closing:
        "आप किसी मुसीबत में नहीं हैं। असली टैक्स मामले पहले डाक से निपटाए जाते हैं, कभी अचानक फ़ोन कॉल से नहीं।",
    },
    debtSection: {
      title: "एक वसूली एजेंट ने मुझे कॉल किया",
      intro:
        "कर्ज़ से निपटना पहले ही तनावपूर्ण है। आपके साथ सम्मान से पेश आना चाहिए, और कानून आपके साथ है।",
      rightsTitle: "आपके अधिकार:",
      rightsList: [
        "आपको बिना धमकी के, सम्मानपूर्वक पेश आने का अधिकार है",
        "आप सबूत माँग सकते हैं कि कर्ज़ वाकई आपका है",
        "आप कह सकते हैं कि वे आपसे केवल लिखित रूप में संपर्क करें",
      ],
      cannotTitle: "वसूली एजेंट ये नहीं कर सकता:",
      cannotList: [
        "धमकाना, डराना या अपमानजनक भाषा का इस्तेमाल करना",
        "सुबह 7:00 बजे से पहले या रात 9:00 बजे के बाद कॉल करना",
        "आपके कर्ज़ के बारे में आपके नियोक्ता, परिवार या दोस्तों से संपर्क करना",
        "इतनी बार कॉल करना कि वह उत्पीड़न बन जाए",
      ],
      reportInfo:
        "आपको अकेले इसका सामना नहीं करना है। दुर्व्यवहार की रिपोर्ट करने के लिए, Financial Consumer Agency of Canada से संपर्क करें: 1-866-461-3222।",
    },
    dncSection: {
      title: "मुझे बार-बार बिक्री वाली कॉल आती हैं",
      body: "आप अपना नंबर कनाडा की National Do Not Call List में जोड़कर ज़्यादातर अनचाही टेलीमार्केटिंग कॉल मुफ़्त में रोक सकते हैं। इसमें लगभग दो मिनट लगते हैं। lnnte-dncl.gc.ca पर ऑनलाइन रजिस्टर करें, या फ़ोन से 1-866-580-3625 पर रजिस्टर करें।",
    },
    scammedSection: {
      title: "मुझे लगता है मेरे साथ धोखा हुआ है",
      intro: "कोई बात नहीं। ठग लोगों को बहकाने में माहिर होते हैं। यह आपकी गलती नहीं है।",
      stepsTitle: "उठाए जाने वाले कदम:",
      stepsList: [
        "अगर आपने बैंक जानकारी साझा की है, तो अपने खाते सुरक्षित करने के लिए तुरंत अपने बैंक को कॉल करें।",
        "जो हुआ उसे लिख लें — नंबर, समय, और क्या कहा गया।",
        "इसकी रिपोर्ट Canadian Anti-Fraud Centre को करें: 1-888-495-8501।",
        "अगर आपके पैसे गए हैं, तो अपनी स्थानीय पुलिस को भी रिपोर्ट करें।",
      ],
    },
    lookupCta: {
      text: "किसी कॉल को लेकर अनिश्चित हैं? उसे खोजें और रिपोर्ट करें ताकि दूसरों की रक्षा हो।",
      button: "नंबर खोजें",
    },
  },

  fr: {
    pageTitle: "Connaissez vos droits",
    pageDescription:
      "Que faire lorsque vous recevez un appel suspect au Canada. Guide gratuit sur les arnaques liées à l'ARC, vos droits face aux agences de recouvrement et le blocage des appels de télémarketing.",
    intro:
      "Chaque jour, des millions de Canadiens reçoivent des appels conçus pour leur faire peur. Les fraudeurs savent que bien des gens s'inquiètent de leurs impôts, de leurs dettes ou de leur statut d'immigration — et ils se servent de cette peur contre vous. Ce guide vous aide à comprendre vos droits et à savoir exactement quoi faire.",
    craSection: {
      title: "Quelqu'un a appelé en prétendant être l'ARC",
      intro:
        "Un véritable appel de l'Agence du revenu du Canada n'a rien à voir avec une arnaque. Voici comment les distinguer.",
      tableHeaders: ["Un véritable agent de l'ARC", "Un fraudeur"],
      tableRows: [
        ["Envoie d'abord une lettre par la poste, avant tout appel", "Appelle à l'improviste et crée un sentiment d'urgence"],
        ["Reste calme et vous laisse vérifier son identité", "Vous menace d'arrestation, d'expulsion ou de la police"],
        ["Accepte des modes de paiement normaux et traçables", "Exige des cartes-cadeaux, des virements électroniques, des cryptomonnaies ou des bitcoins"],
        ["Ne vous presse jamais d'agir dans les minutes qui suivent", "Affirme que vous devez payer immédiatement, sous peine de conséquences"],
      ],
      neverTitle: "L'ARC ne fera JAMAIS ce qui suit :",
      neverList: [
        "Vous menacer d'une arrestation immédiate ou envoyer la police",
        "Exiger un paiement par cartes-cadeaux, cryptomonnaie ou virement électronique",
        "Demander votre NAS, votre passeport ou vos coordonnées bancaires par téléphone",
        "Employer un langage agressif ou menaçant pour vous effrayer",
      ],
      whatToDoTitle: "Quoi faire :",
      whatToDo: [
        "Raccrochez. Vous avez parfaitement le droit de mettre fin à l'appel.",
        "Respirez. Rien de grave n'arrive parce que vous avez raccroché.",
        "Pour en avoir le cœur net, appelez l'ARC directement au 1-800-959-8281.",
      ],
      closing:
        "Vous n'avez pas d'ennuis. Les véritables questions fiscales sont d'abord traitées par la poste, jamais par des appels-surprises.",
    },
    debtSection: {
      title: "Une agence de recouvrement m'a appelé",
      intro:
        "Gérer une dette est déjà stressant. Vous méritez d'être traité avec dignité, et la loi est de votre côté.",
      rightsTitle: "Vos droits :",
      rightsList: [
        "Vous avez le droit d'être traité avec respect, sans menaces",
        "Vous pouvez exiger une preuve que la dette est bien la vôtre",
        "Vous pouvez demander à l'agent de ne communiquer avec vous que par écrit",
      ],
      cannotTitle: "Un agent de recouvrement ne peut pas :",
      cannotList: [
        "Vous menacer, vous intimider ou employer un langage abusif",
        "Appeler avant 7 h ou après 21 h",
        "Communiquer avec votre employeur, votre famille ou vos amis au sujet de votre dette",
        "Appeler si souvent que cela devient du harcèlement",
      ],
      reportInfo:
        "Vous n'avez pas à affronter cela seul. Pour signaler un abus, communiquez avec l'Agence de la consommation en matière financière du Canada au 1-866-461-3222.",
    },
    dncSection: {
      title: "Je reçois sans cesse des appels de vente",
      body: "Vous pouvez bloquer gratuitement la plupart des appels de télémarketing indésirables en inscrivant votre numéro sur la Liste nationale de numéros de télécommunication exclus du Canada. Cela prend environ deux minutes. Inscrivez-vous en ligne à lnnte-dncl.gc.ca, ou par téléphone au 1-866-580-3625.",
    },
    scammedSection: {
      title: "Je pense avoir été victime d'une arnaque",
      intro:
        "Ce n'est pas grave. Les fraudeurs sont des professionnels de la manipulation. Ce n'est pas de votre faute.",
      stepsTitle: "Les étapes à suivre :",
      stepsList: [
        "Si vous avez communiqué vos coordonnées bancaires, appelez immédiatement votre banque pour protéger vos comptes.",
        "Notez ce qui s'est passé — le numéro, l'heure et ce qui a été dit.",
        "Signalez-le au Centre antifraude du Canada au 1-888-495-8501.",
        "Si vous avez perdu de l'argent, signalez-le aussi à votre service de police local.",
      ],
    },
    lookupCta: {
      text: "Un appel vous laisse perplexe ? Cherchez le numéro et signalez-le pour protéger les autres.",
      button: "Rechercher un numéro",
    },
  },

  es: {
    pageTitle: "Conozca sus derechos",
    pageDescription:
      "Qué hacer cuando recibe una llamada sospechosa en Canadá. Guía gratuita sobre estafas que se hacen pasar por la CRA, sus derechos ante los cobradores y el bloqueo de llamadas de telemercadeo.",
    intro:
      "Cada día, millones de canadienses reciben llamadas diseñadas para asustarlos. Los estafadores saben que muchas personas se preocupan por los impuestos, las deudas o su situación migratoria, y usan ese miedo en su contra. Esta guía está aquí para ayudarle a entender sus derechos y saber exactamente qué hacer.",
    craSection: {
      title: "Alguien llamó diciendo ser de la CRA",
      intro:
        "Una llamada real de la Agencia de Ingresos de Canadá (CRA) es muy distinta de una estafa. Así puede diferenciarlas.",
      tableHeaders: ["Un agente real de la CRA", "Un estafador"],
      tableRows: [
        ["Envía primero una carta por correo, antes de llamar", "Llama de repente y crea una sensación de urgencia"],
        ["Mantiene la calma y le permite verificar su identidad", "Lo amenaza con arresto, deportación o la policía"],
        ["Acepta métodos de pago normales y rastreables", "Exige tarjetas de regalo, transferencias electrónicas, cripto o Bitcoin"],
        ["Nunca lo presiona a actuar en los próximos minutos", "Dice que debe pagar de inmediato o enfrentará consecuencias"],
      ],
      neverTitle: "La CRA NUNCA hará lo siguiente:",
      neverList: [
        "Amenazarlo con arresto inmediato o enviar a la policía",
        "Exigir el pago con tarjetas de regalo, criptomonedas o transferencia electrónica",
        "Pedirle su número de seguro social (SIN), pasaporte o datos bancarios por teléfono",
        "Usar un lenguaje agresivo o amenazante para asustarlo",
      ],
      whatToDoTitle: "Qué hacer:",
      whatToDo: [
        "Cuelgue. Tiene todo el derecho de terminar la llamada.",
        "Respire. No pasa nada malo por haber colgado.",
        "Si quiere asegurarse, llame directamente a la CRA al 1-800-959-8281.",
      ],
      closing:
        "Usted no está en problemas. Los asuntos fiscales reales se tratan primero por correo, nunca con llamadas sorpresa.",
    },
    debtSection: {
      title: "Me llamó un cobrador de deudas",
      intro:
        "Lidiar con una deuda ya es bastante estresante. Usted merece ser tratado con dignidad, y la ley está de su lado.",
      rightsTitle: "Sus derechos:",
      rightsList: [
        "Tiene derecho a ser tratado con respeto, sin amenazas",
        "Puede pedir una prueba de que la deuda es realmente suya",
        "Puede pedirle al cobrador que solo lo contacte por escrito",
      ],
      cannotTitle: "Un cobrador no puede:",
      cannotList: [
        "Amenazar, intimidar o usar lenguaje abusivo",
        "Llamar antes de las 7:00 a. m. o después de las 9:00 p. m.",
        "Contactar a su empleador, familia o amistades por su deuda",
        "Llamar con tanta frecuencia que se convierta en acoso",
      ],
      reportInfo:
        "No tiene que enfrentar esto solo. Para denunciar un abuso, comuníquese con la Agencia de Defensa del Consumidor Financiero de Canadá al 1-866-461-3222.",
    },
    dncSection: {
      title: "Recibo llamadas de venta constantemente",
      body: "Puede detener gratis la mayoría de las llamadas de telemercadeo no deseadas agregando su número a la Lista Nacional de Números Excluidos de Canadá. Toma unos dos minutos. Regístrese en línea en lnnte-dncl.gc.ca, o por teléfono al 1-866-580-3625.",
    },
    scammedSection: {
      title: "Creo que me estafaron",
      intro:
        "Está bien. Los estafadores son profesionales de la manipulación. Esto no es culpa suya.",
      stepsTitle: "Pasos a seguir:",
      stepsList: [
        "Si compartió datos bancarios, llame de inmediato a su banco para proteger sus cuentas.",
        "Anote lo que pasó: el número, la hora y lo que se dijo.",
        "Denúncielo al Centro Antifraude de Canadá al 1-888-495-8501.",
        "Si perdió dinero, denúncielo también a su servicio de policía local.",
      ],
    },
    lookupCta: {
      text: "¿Recibió una llamada que no le da confianza? Búsquela y repórtela para proteger a los demás.",
      button: "Buscar un número",
    },
  },

  ko: {
    pageTitle: "권리를 알아두세요",
    pageDescription:
      "캐나다에서 의심스러운 전화를 받았을 때 대처법. CRA 사칭 사기, 채권 추심에 대한 권리, 텔레마케팅 차단에 관한 무료 안내입니다.",
    intro:
      "매일 수백만 명의 캐나다인이 겁을 주려고 만든 전화를 받습니다. 사기꾼들은 많은 사람이 세금, 빚, 이민 신분을 걱정한다는 것을 알고 그 두려움을 이용합니다. 이 안내서는 여러분의 권리를 이해하고 무엇을 해야 하는지 정확히 알 수 있도록 돕습니다.",
    craSection: {
      title: "누군가 CRA(국세청)라고 하며 전화했어요",
      intro:
        "캐나다 국세청(CRA)의 실제 전화는 사기 전화와 매우 다릅니다. 다음과 같이 구분하세요.",
      tableHeaders: ["진짜 CRA 직원", "사기꾼"],
      tableRows: [
        ["전화하기 전에 먼저 우편으로 편지를 보냅니다", "갑자기 전화해 다급하게 만듭니다"],
        ["침착하며 신원을 확인하게 해 줍니다", "체포, 추방 또는 경찰로 위협합니다"],
        ["정상적이고 추적 가능한 결제 방법을 받습니다", "기프트 카드, 이체, 암호화폐, 비트코인을 요구합니다"],
        ["몇 분 안에 행동하라고 압박하지 않습니다", "지금 당장 내지 않으면 불이익을 받는다고 말합니다"],
      ],
      neverTitle: "CRA는 절대 다음과 같이 하지 않습니다:",
      neverList: [
        "즉시 체포하겠다고 위협하거나 경찰을 보내는 일",
        "기프트 카드, 암호화폐, 이체로 납부를 요구하는 일",
        "전화로 SIN(사회보험번호), 여권, 은행 정보를 묻는 일",
        "겁을 주려고 공격적이거나 위협적인 말을 쓰는 일",
      ],
      whatToDoTitle: "해야 할 일:",
      whatToDo: [
        "전화를 끊으세요. 그냥 통화를 끝내도 됩니다.",
        "심호흡을 하세요. 전화를 끊었다고 나쁜 일은 생기지 않습니다.",
        "확실히 하려면 CRA에 직접 전화하세요: 1-800-959-8281.",
      ],
      closing:
        "당신은 곤경에 빠진 것이 아닙니다. 실제 세금 문제는 항상 먼저 우편으로 처리되며, 갑작스러운 전화로 처리되지 않습니다.",
    },
    debtSection: {
      title: "채권 추심원이 전화했어요",
      intro:
        "빚을 다루는 일은 그 자체로 힘듭니다. 당신은 존중받을 자격이 있으며, 법이 당신의 편입니다.",
      rightsTitle: "당신의 권리:",
      rightsList: [
        "위협 없이 존중받으며 대우받을 권리가 있습니다",
        "그 빚이 정말 당신의 것인지 증거를 요구할 수 있습니다",
        "추심원에게 서면으로만 연락하도록 요청할 수 있습니다",
      ],
      cannotTitle: "추심원이 할 수 없는 일:",
      cannotList: [
        "위협하거나 겁을 주거나 모욕적인 말을 사용하는 일",
        "오전 7시 이전이나 오후 9시 이후에 전화하는 일",
        "당신의 빚에 대해 고용주, 가족, 친구에게 연락하는 일",
        "괴롭힘이 될 정도로 자주 전화하는 일",
      ],
      reportInfo:
        "혼자 감당하지 않아도 됩니다. 부당 행위를 신고하려면 Financial Consumer Agency of Canada에 연락하세요: 1-866-461-3222.",
    },
    dncSection: {
      title: "판매 전화가 계속 와요",
      body: "캐나다의 수신 거부 목록(National Do Not Call List)에 번호를 등록하면 원치 않는 대부분의 텔레마케팅 전화를 무료로 막을 수 있습니다. 약 2분 걸립니다. lnnte-dncl.gc.ca에서 온라인으로 등록하거나 전화로 1-866-580-3625에 등록하세요.",
    },
    scammedSection: {
      title: "사기를 당한 것 같아요",
      intro: "괜찮습니다. 사기꾼은 사람을 조종하는 전문가입니다. 이것은 당신의 잘못이 아닙니다.",
      stepsTitle: "해야 할 단계:",
      stepsList: [
        "은행 정보를 알려줬다면, 계좌를 보호하기 위해 즉시 은행에 전화하세요.",
        "무슨 일이 있었는지 적어두세요 — 번호, 시간, 그리고 무슨 말을 했는지.",
        "Canadian Anti-Fraud Centre에 신고하세요: 1-888-495-8501.",
        "돈을 잃었다면 지역 경찰에도 신고하세요.",
      ],
    },
    lookupCta: {
      text: "확실하지 않은 전화를 받으셨나요? 번호를 조회하고 신고하여 다른 사람을 보호하세요.",
      button: "번호 조회",
    },
  },

  vi: {
    pageTitle: "Biết quyền của bạn",
    pageDescription:
      "Phải làm gì khi bạn nhận được cuộc gọi đáng ngờ ở Canada. Hướng dẫn miễn phí về lừa đảo mạo danh CRA, quyền của bạn trước người đòi nợ, và chặn cuộc gọi tiếp thị.",
    intro:
      "Mỗi ngày, hàng triệu người Canada nhận các cuộc gọi được tạo ra để khiến họ sợ hãi. Kẻ lừa đảo biết rằng nhiều người lo lắng về thuế, nợ nần hoặc tình trạng di trú — và chúng lợi dụng nỗi sợ đó để chống lại bạn. Hướng dẫn này giúp bạn hiểu quyền của mình và biết chính xác phải làm gì.",
    craSection: {
      title: "Có người gọi tự xưng là CRA",
      intro:
        "Một cuộc gọi thật từ Cơ quan Thuế Canada (CRA) rất khác với lừa đảo. Đây là cách phân biệt.",
      tableHeaders: ["Nhân viên CRA thật", "Kẻ lừa đảo"],
      tableRows: [
        ["Gửi thư qua bưu điện trước, trước khi gọi", "Gọi bất ngờ và tạo cảm giác gấp gáp"],
        ["Bình tĩnh và để bạn xác minh danh tính của họ", "Đe dọa bắt giữ, trục xuất hoặc gọi cảnh sát"],
        ["Chấp nhận cách thanh toán bình thường, có thể truy vết", "Đòi thẻ quà tặng, chuyển khoản điện tử, tiền mã hóa hoặc Bitcoin"],
        ["Không bao giờ ép bạn hành động trong vài phút", "Nói bạn phải trả ngay nếu không sẽ gánh hậu quả"],
      ],
      neverTitle: "CRA sẽ KHÔNG BAO GIỜ:",
      neverList: [
        "Đe dọa bắt giữ ngay hoặc cử cảnh sát đến",
        "Đòi thanh toán bằng thẻ quà tặng, tiền mã hóa hoặc chuyển khoản điện tử",
        "Hỏi số SIN, hộ chiếu hoặc thông tin ngân hàng của bạn qua điện thoại",
        "Dùng lời lẽ hung hăng hoặc đe dọa để làm bạn sợ",
      ],
      whatToDoTitle: "Việc cần làm:",
      whatToDo: [
        "Cúp máy. Bạn hoàn toàn có quyền kết thúc cuộc gọi.",
        "Hít thở. Không có chuyện xấu nào xảy ra vì bạn đã cúp máy.",
        "Nếu muốn chắc chắn, hãy gọi trực tiếp cho CRA: 1-800-959-8281.",
      ],
      closing:
        "Bạn không gặp rắc rối gì. Các vấn đề thuế thật sự luôn được xử lý qua thư trước, không bao giờ bằng cuộc gọi bất ngờ.",
    },
    debtSection: {
      title: "Một người đòi nợ đã gọi cho tôi",
      intro:
        "Việc xử lý nợ nần vốn đã căng thẳng. Bạn xứng đáng được đối xử tử tế, và pháp luật đứng về phía bạn.",
      rightsTitle: "Quyền của bạn:",
      rightsList: [
        "Bạn có quyền được đối xử tôn trọng, không bị đe dọa",
        "Bạn có thể yêu cầu bằng chứng rằng khoản nợ thật sự là của bạn",
        "Bạn có thể yêu cầu họ chỉ liên hệ với bạn bằng văn bản",
      ],
      cannotTitle: "Người đòi nợ không được:",
      cannotList: [
        "Đe dọa, uy hiếp hoặc dùng lời lẽ lăng mạ",
        "Gọi trước 7 giờ sáng hoặc sau 9 giờ tối",
        "Liên hệ với chủ lao động, gia đình hoặc bạn bè của bạn về khoản nợ",
        "Gọi nhiều đến mức trở thành quấy rối",
      ],
      reportInfo:
        "Bạn không phải đối mặt một mình. Để báo cáo hành vi sai trái, hãy liên hệ Financial Consumer Agency of Canada: 1-866-461-3222.",
    },
    dncSection: {
      title: "Tôi liên tục nhận cuộc gọi chào hàng",
      body: "Bạn có thể chặn miễn phí hầu hết các cuộc gọi tiếp thị không mong muốn bằng cách thêm số của mình vào Danh sách Không Gọi Quốc gia của Canada. Mất khoảng hai phút. Đăng ký trực tuyến tại lnnte-dncl.gc.ca, hoặc đăng ký qua điện thoại tại 1-866-580-3625.",
    },
    scammedSection: {
      title: "Tôi nghĩ mình đã bị lừa",
      intro:
        "Không sao cả. Kẻ lừa đảo là chuyên gia thao túng. Đây không phải lỗi của bạn.",
      stepsTitle: "Các bước cần làm:",
      stepsList: [
        "Nếu bạn đã tiết lộ thông tin ngân hàng, hãy gọi ngay cho ngân hàng để bảo vệ tài khoản của bạn.",
        "Ghi lại những gì đã xảy ra — số điện thoại, thời gian và những gì đã nói.",
        "Báo cáo cho Canadian Anti-Fraud Centre: 1-888-495-8501.",
        "Nếu bạn bị mất tiền, hãy báo cho cảnh sát địa phương.",
      ],
    },
    lookupCta: {
      text: "Nhận được cuộc gọi không chắc chắn? Hãy tra cứu và báo cáo để bảo vệ người khác.",
      button: "Tra cứu số",
    },
  },
};
