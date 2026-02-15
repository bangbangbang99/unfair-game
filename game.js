(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const returnCountEl = document.getElementById("returnCount");
  const bestCountEl = document.getElementById("bestCount");
  const speedMultEl = document.getElementById("speedMult");
  const boostInput = document.getElementById("boostInput");
  const themeNameEl = document.getElementById("themeName");
  const rankingListEl = document.getElementById("rankingList");

  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const unfairBtn = document.getElementById("unfairBtn");
  const exportRankingBtn = document.getElementById("exportRankingBtn");
  const importRankingBtn = document.getElementById("importRankingBtn");
  const importRankingInput = document.getElementById("importRankingInput");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");

  const W = canvas.width;
  const H = canvas.height;

  const player = {
    x: 20,
    y: H / 2 - 20,
    w: 8,
    h: 40,
    speed: 560
  };

  const cpu = {
    w: 22,
    h: 260,
    speed: 620,
    x: W - 22 - 20,
    y: H / 2 - 130,
    aim: 0.84
  };

  const ball = {
    x: W / 2,
    y: H / 2,
    r: 8,
    vx: 0,
    vy: 0,
    baseSpeed: 300
  };

  let running = false;
  let rafId = 0;
  let lastTime = 0;

  let returnCount = 0;
  let bestCount = 0;
  let ranking = [];

  let speedMultiplier = 1;
  const defaultBoost = 1.1;
  const rankingStorageKey = "unfair_pong_return_ranking_v1";

  const taunts = [
    "실력이 형편없군요",
    "그 손으로 이걸 하겠다고요?",
    "CPU가 눈 감고도 이기네요",
    "지금 공이 아니라 자존심이 튕겼습니다",
    "연습 모드도 울고 가겠네요",
    "패배가 아주 자연스럽습니다",
    "라켓이 아니라 장식품이네요",
    "방금 장면은 재난 영상 급입니다",
    "게임이 아니라 고문 체험이군요",
    "CPU: 오늘도 쉬운 승리 감사합니다",
    "컨트롤 키가 도망갔나요",
    "이 정도면 공이 불쌍합니다",
    "하이라이트가 전부 실수네요",
    "손보다 핑계가 더 빠르군요",
    "전설의 역방향 실력",
    "불합리도 감당 못 하면 어쩌죠",
    "다음 판도 결과는 같을 예정입니다",
    "CPU가 지금 하품했습니다"
  ];

  const keys = {
    up: false,
    down: false
  };

  let pointerActive = false;
  let pointerY = 0;

  let theme = null;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function seededPick(list, seed) {
    return list[seed % list.length];
  }

  function getSeason(month) {
    if (month >= 3 && month <= 5) {
      return "spring";
    }
    if (month >= 6 && month <= 8) {
      return "summer";
    }
    if (month >= 9 && month <= 11) {
      return "autumn";
    }
    return "winter";
  }

  function toIsoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseIsoDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function dayDiff(a, b) {
    const dayMs = 24 * 60 * 60 * 1000;
    const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((aa - bb) / dayMs);
  }

  const MOVABLE_HOLIDAY_TAGS = {
    "2025-01-28": ["KR:Lunar New Year"],
    "2025-01-29": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2025-01-30": ["KR:Lunar New Year"],
    "2025-03-03": ["BR:Carnival"],
    "2025-03-04": ["BR:Carnival"],
    "2025-04-20": ["DE:Easter Sunday"],
    "2025-08-15": ["KR:Liberation Day"],
    "2025-10-03": ["KR:National Foundation Day"],
    "2025-10-06": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2025-10-07": ["KR:Chuseok"],
    "2025-10-08": ["KR:Chuseok"],
    "2025-10-09": ["KR:Hangul Day"],
    "2025-11-27": ["US:Thanksgiving Day"],
    "2026-02-16": ["KR:Lunar New Year", "BR:Carnival"],
    "2026-02-17": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)", "BR:Carnival"],
    "2026-02-18": ["KR:Lunar New Year"],
    "2026-04-05": ["DE:Easter Sunday"],
    "2026-08-15": ["KR:Liberation Day"],
    "2026-09-24": ["KR:Chuseok"],
    "2026-09-25": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2026-09-26": ["KR:Chuseok"],
    "2026-10-03": ["KR:National Foundation Day"],
    "2026-10-09": ["KR:Hangul Day"],
    "2026-11-26": ["US:Thanksgiving Day"],
    "2027-02-06": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2027-02-08": ["KR:Lunar New Year", "BR:Carnival"],
    "2027-02-09": ["KR:Lunar New Year", "BR:Carnival"],
    "2027-03-28": ["DE:Easter Sunday"],
    "2027-08-15": ["KR:Liberation Day"],
    "2027-09-14": ["KR:Chuseok"],
    "2027-09-15": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2027-09-16": ["KR:Chuseok"],
    "2027-10-03": ["KR:National Foundation Day"],
    "2027-10-09": ["KR:Hangul Day"],
    "2027-11-25": ["US:Thanksgiving Day"],
    "2028-01-26": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2028-01-27": ["KR:Lunar New Year"],
    "2028-01-28": ["KR:Lunar New Year"],
    "2028-02-28": ["BR:Carnival"],
    "2028-02-29": ["BR:Carnival"],
    "2028-04-16": ["DE:Easter Sunday"],
    "2028-08-15": ["KR:Liberation Day"],
    "2028-10-02": ["KR:Chuseok"],
    "2028-10-03": ["KR:National Foundation Day", "KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2028-10-04": ["KR:Chuseok"],
    "2028-10-09": ["KR:Hangul Day"],
    "2028-11-23": ["US:Thanksgiving Day"],
    "2029-02-12": ["KR:Lunar New Year", "BR:Carnival"],
    "2029-02-13": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)", "BR:Carnival"],
    "2029-02-14": ["KR:Lunar New Year"],
    "2029-04-01": ["DE:Easter Sunday"],
    "2029-08-15": ["KR:Liberation Day"],
    "2029-09-21": ["KR:Chuseok"],
    "2029-09-22": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2029-09-24": ["KR:Chuseok"],
    "2029-10-03": ["KR:National Foundation Day"],
    "2029-10-09": ["KR:Hangul Day"],
    "2029-11-22": ["US:Thanksgiving Day"],
    "2030-02-02": ["KR:Lunar New Year"],
    "2030-02-03": ["CN:Chinese New Year (Spring Festival)"],
    "2030-02-04": ["KR:Lunar New Year"],
    "2030-02-05": ["KR:Lunar New Year"],
    "2030-03-04": ["BR:Carnival"],
    "2030-03-05": ["BR:Carnival"],
    "2030-04-21": ["DE:Easter Sunday"],
    "2030-08-15": ["KR:Liberation Day"],
    "2030-09-11": ["KR:Chuseok"],
    "2030-09-12": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2030-09-13": ["KR:Chuseok"],
    "2030-10-03": ["KR:National Foundation Day"],
    "2030-10-09": ["KR:Hangul Day"],
    "2030-11-28": ["US:Thanksgiving Day"],
    "2031-01-22": ["KR:Lunar New Year"],
    "2031-01-23": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2031-01-24": ["KR:Lunar New Year"],
    "2031-02-24": ["BR:Carnival"],
    "2031-02-25": ["BR:Carnival"],
    "2031-04-13": ["DE:Easter Sunday"],
    "2031-08-15": ["KR:Liberation Day"],
    "2031-09-30": ["KR:Chuseok"],
    "2031-10-01": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2031-10-02": ["KR:Chuseok"],
    "2031-10-03": ["KR:National Foundation Day"],
    "2031-10-09": ["KR:Hangul Day"],
    "2031-11-27": ["US:Thanksgiving Day"],
    "2032-02-09": ["BR:Carnival"],
    "2032-02-10": ["KR:Lunar New Year", "BR:Carnival"],
    "2032-02-11": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2032-02-12": ["KR:Lunar New Year"],
    "2032-03-28": ["DE:Easter Sunday"],
    "2032-08-15": ["KR:Liberation Day"],
    "2032-09-18": ["KR:Chuseok"],
    "2032-09-19": ["CN:Mid-Autumn Festival"],
    "2032-09-20": ["KR:Chuseok"],
    "2032-09-21": ["KR:Chuseok"],
    "2032-10-03": ["KR:National Foundation Day"],
    "2032-10-09": ["KR:Hangul Day"],
    "2032-11-25": ["US:Thanksgiving Day"],
    "2033-01-29": ["KR:Lunar New Year"],
    "2033-01-31": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2033-02-01": ["KR:Lunar New Year"],
    "2033-02-28": ["BR:Carnival"],
    "2033-03-01": ["BR:Carnival"],
    "2033-04-17": ["DE:Easter Sunday"],
    "2033-08-15": ["KR:Liberation Day"],
    "2033-09-07": ["KR:Chuseok"],
    "2033-09-08": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2033-09-09": ["KR:Chuseok"],
    "2033-10-03": ["KR:National Foundation Day"],
    "2033-10-09": ["KR:Hangul Day"],
    "2033-11-24": ["US:Thanksgiving Day"],
    "2034-02-18": ["KR:Lunar New Year"],
    "2034-02-19": ["CN:Chinese New Year (Spring Festival)"],
    "2034-02-20": ["KR:Lunar New Year", "BR:Carnival"],
    "2034-02-21": ["KR:Lunar New Year", "BR:Carnival"],
    "2034-04-09": ["DE:Easter Sunday"],
    "2034-08-15": ["KR:Liberation Day"],
    "2034-09-26": ["KR:Chuseok"],
    "2034-09-27": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2034-09-28": ["KR:Chuseok"],
    "2034-10-03": ["KR:National Foundation Day"],
    "2034-10-09": ["KR:Hangul Day"],
    "2034-11-23": ["US:Thanksgiving Day"],
    "2035-02-05": ["BR:Carnival"],
    "2035-02-06": ["BR:Carnival"],
    "2035-02-07": ["KR:Lunar New Year"],
    "2035-02-08": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2035-02-09": ["KR:Lunar New Year"],
    "2035-03-25": ["DE:Easter Sunday"],
    "2035-08-15": ["KR:Liberation Day"],
    "2035-09-15": ["KR:Chuseok"],
    "2035-09-16": ["CN:Mid-Autumn Festival"],
    "2035-09-17": ["KR:Chuseok"],
    "2035-09-18": ["KR:Chuseok"],
    "2035-10-03": ["KR:National Foundation Day"],
    "2035-10-09": ["KR:Hangul Day"],
    "2035-11-22": ["US:Thanksgiving Day"],
    "2036-01-26": ["KR:Lunar New Year"],
    "2036-01-28": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2036-01-29": ["KR:Lunar New Year"],
    "2036-02-25": ["BR:Carnival"],
    "2036-02-26": ["BR:Carnival"],
    "2036-04-13": ["DE:Easter Sunday"],
    "2036-08-15": ["KR:Liberation Day"],
    "2036-10-03": ["KR:National Foundation Day", "KR:Chuseok"],
    "2036-10-04": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2036-10-06": ["KR:Chuseok"],
    "2036-10-09": ["KR:Hangul Day"],
    "2036-11-27": ["US:Thanksgiving Day"],
    "2037-02-14": ["KR:Lunar New Year"],
    "2037-02-15": ["CN:Chinese New Year (Spring Festival)"],
    "2037-02-16": ["KR:Lunar New Year", "BR:Carnival"],
    "2037-02-17": ["KR:Lunar New Year", "BR:Carnival"],
    "2037-04-05": ["DE:Easter Sunday"],
    "2037-08-15": ["KR:Liberation Day"],
    "2037-09-23": ["KR:Chuseok"],
    "2037-09-24": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2037-09-25": ["KR:Chuseok"],
    "2037-10-03": ["KR:National Foundation Day"],
    "2037-10-09": ["KR:Hangul Day"],
    "2037-11-26": ["US:Thanksgiving Day"],
    "2038-02-03": ["KR:Lunar New Year"],
    "2038-02-04": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2038-02-05": ["KR:Lunar New Year"],
    "2038-03-08": ["BR:Carnival"],
    "2038-03-09": ["BR:Carnival"],
    "2038-04-25": ["DE:Easter Sunday"],
    "2038-08-15": ["KR:Liberation Day"],
    "2038-09-13": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2038-09-14": ["KR:Chuseok"],
    "2038-09-15": ["KR:Chuseok"],
    "2038-10-03": ["KR:National Foundation Day"],
    "2038-10-09": ["KR:Hangul Day"],
    "2038-11-25": ["US:Thanksgiving Day"],
    "2039-01-22": ["KR:Lunar New Year"],
    "2039-01-24": ["KR:Lunar New Year", "CN:Chinese New Year (Spring Festival)"],
    "2039-01-25": ["KR:Lunar New Year"],
    "2039-02-21": ["BR:Carnival"],
    "2039-02-22": ["BR:Carnival"],
    "2039-04-10": ["DE:Easter Sunday"],
    "2039-08-15": ["KR:Liberation Day"],
    "2039-10-01": ["KR:Chuseok"],
    "2039-10-02": ["CN:Mid-Autumn Festival"],
    "2039-10-03": ["KR:National Foundation Day", "KR:Chuseok"],
    "2039-10-04": ["KR:Chuseok"],
    "2039-10-09": ["KR:Hangul Day"],
    "2039-11-24": ["US:Thanksgiving Day"],
    "2040-02-11": ["KR:Lunar New Year"],
    "2040-02-12": ["CN:Chinese New Year (Spring Festival)"],
    "2040-02-13": ["KR:Lunar New Year", "BR:Carnival"],
    "2040-02-14": ["KR:Lunar New Year", "BR:Carnival"],
    "2040-04-01": ["DE:Easter Sunday"],
    "2040-08-15": ["KR:Liberation Day"],
    "2040-09-20": ["KR:Chuseok", "CN:Mid-Autumn Festival"],
    "2040-09-21": ["KR:Chuseok"],
    "2040-09-22": ["KR:Chuseok"],
    "2040-10-03": ["KR:National Foundation Day"],
    "2040-10-09": ["KR:Hangul Day"],
    "2040-11-22": ["US:Thanksgiving Day"],
  };

  const FIXED_HOLIDAY_TAGS = {
    "01-01": "GLOBAL:New Year",
    "04-05": "KR:Arbor Day",
    "05-01": "GLOBAL:Labour Day",
    "10-31": "GLOBAL:Halloween",
    "12-25": "GLOBAL:Christmas"
  };

  const HOLIDAY_PRIORITY = [
    "KR:Lunar New Year",
    "KR:Chuseok",
    "CN:Chinese New Year (Spring Festival)",
    "CN:Mid-Autumn Festival",
    "GLOBAL:Christmas",
    "GLOBAL:Halloween",
    "US:Thanksgiving Day",
    "DE:Easter Sunday",
    "BR:Carnival",
    "KR:Arbor Day",
    "KR:Liberation Day",
    "KR:National Foundation Day",
    "KR:Hangul Day",
    "GLOBAL:New Year",
    "GLOBAL:Labour Day"
  ];

  const HOLIDAY_THEME_BY_TAG = {
    "KR:Lunar New Year": {
      name: "설날",
      palette: { top: "#4a1d32", bottom: "#3a0f24", spot: "#6e2448", accent: "#fda4af" },
      overlay: "festivalLanterns"
    },
    "KR:Chuseok": {
      name: "추석",
      palette: { top: "#1f244a", bottom: "#181b35", spot: "#2d3b7d", accent: "#fde68a" },
      overlay: "chuseokMoon"
    },
    "CN:Chinese New Year (Spring Festival)": {
      name: "춘절",
      palette: { top: "#5b1111", bottom: "#3f0a0a", spot: "#7f1d1d", accent: "#fbbf24" },
      overlay: "festivalLanterns"
    },
    "CN:Mid-Autumn Festival": {
      name: "중추절",
      palette: { top: "#1b2550", bottom: "#141b36", spot: "#253b87", accent: "#fde68a" },
      overlay: "chuseokMoon"
    },
    "US:Thanksgiving Day": {
      name: "Thanksgiving",
      palette: { top: "#5a341f", bottom: "#3f2518", spot: "#7a4a2f", accent: "#fb923c" },
      overlay: "autumnLeaves"
    },
    "DE:Easter Sunday": {
      name: "Easter",
      palette: { top: "#1e3a4f", bottom: "#1f4c3f", spot: "#2d6a5d", accent: "#f9a8d4" },
      overlay: "easterEggs"
    },
    "BR:Carnival": {
      name: "Carnival",
      palette: { top: "#3f1d73", bottom: "#1e1b4b", spot: "#6d28d9", accent: "#f472b6" },
      overlay: "carnivalConfetti"
    },
    "KR:Arbor Day": {
      name: "식목일",
      palette: { top: "#173524", bottom: "#1f5b3a", spot: "#2f7d4f", accent: "#86efac" },
      overlay: "forest"
    },
    "KR:Liberation Day": {
      name: "광복절",
      palette: { top: "#1f2937", bottom: "#111827", spot: "#374151", accent: "#f8fafc" },
      overlay: "liberationBands"
    },
    "KR:National Foundation Day": {
      name: "개천절",
      palette: { top: "#1f2937", bottom: "#0f172a", spot: "#334155", accent: "#93c5fd" },
      overlay: "skyLanterns"
    },
    "KR:Hangul Day": {
      name: "한글날",
      palette: { top: "#172554", bottom: "#0f172a", spot: "#1d4ed8", accent: "#93c5fd" },
      overlay: "hangulGlyphs"
    },
    "GLOBAL:New Year": {
      name: "New Year",
      palette: { top: "#1f1b4b", bottom: "#0f172a", spot: "#3730a3", accent: "#fde68a" },
      overlay: "fireworks"
    },
    "GLOBAL:Labour Day": {
      name: "Labour Day",
      palette: { top: "#3f1f1f", bottom: "#2a1414", spot: "#7f1d1d", accent: "#f87171" },
      overlay: "ribbons"
    },
    "GLOBAL:Halloween": {
      name: "Halloween",
      palette: { top: "#1a1325", bottom: "#0f0b17", spot: "#312e81", accent: "#fb923c" },
      overlay: "halloween"
    },
    "GLOBAL:Christmas": {
      name: "Christmas",
      palette: { top: "#0f2a3c", bottom: "#14283b", spot: "#1d4a65", accent: "#86efac" },
      overlay: "christmas"
    }
  };

  function pickHolidayTag(tags) {
    for (const tag of HOLIDAY_PRIORITY) {
      if (tags.includes(tag)) {
        return tag;
      }
    }
    return "";
  }

  function getHolidayInfo(date) {
    const iso = toIsoDate(date);
    const matched = [];

    for (const key of Object.keys(MOVABLE_HOLIDAY_TAGS)) {
      const diff = Math.abs(dayDiff(date, parseIsoDate(key)));
      if (diff <= 2) {
        matched.push({ diff, tags: MOVABLE_HOLIDAY_TAGS[key] });
      }
    }

    const year = date.getFullYear();
    for (const [mmdd, tag] of Object.entries(FIXED_HOLIDAY_TAGS)) {
      const [m, d] = mmdd.split("-").map(Number);
      const candidates = [
        new Date(year - 1, m - 1, d),
        new Date(year, m - 1, d),
        new Date(year + 1, m - 1, d)
      ];
      for (const c of candidates) {
        const diff = Math.abs(dayDiff(date, c));
        if (diff <= 2) {
          matched.push({ diff, tags: [tag] });
        }
      }
    }

    matched.sort((a, b) => a.diff - b.diff);

    const tags = [];
    for (const item of matched) {
      for (const tag of item.tags) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }

    const pickedTag = pickHolidayTag(tags);
    if (!pickedTag) {
      return null;
    }
    const nearest = matched.length > 0 ? matched[0].diff : 0;
    return { tag: pickedTag, near: nearest, ...HOLIDAY_THEME_BY_TAG[pickedTag] };
  }

  function buildTheme(date) {
    const month = date.getMonth() + 1;
    const season = getSeason(month);
    const seed = date.getFullYear() * 10000 + month * 100 + date.getDate();
    const holiday = getHolidayInfo(date);

    const weatherBySeason = {
      spring: ["맑음", "바람", "흐림", "비"],
      summer: ["맑음", "비", "비", "흐림"],
      autumn: ["맑음", "바람", "흐림", "맑음"],
      winter: ["맑음", "눈", "흐림", "바람"]
    };

    const paletteBySeason = {
      spring: { top: "#18324a", bottom: "#2e4c41", spot: "#2d5b54", accent: "#6ee7b7" },
      summer: { top: "#0f2a43", bottom: "#1e3a8a", spot: "#1f5a94", accent: "#38bdf8" },
      autumn: { top: "#3f2a1d", bottom: "#5b3d1f", spot: "#7a4d20", accent: "#f59e0b" },
      winter: { top: "#1d2a3b", bottom: "#1f2937", spot: "#334155", accent: "#93c5fd" }
    };

    const weather = seededPick(weatherBySeason[season], seed);
    const palette = holiday ? { ...holiday.palette } : { ...paletteBySeason[season] };

    return { season, weather, palette, holiday };
  }

  function seasonLabel(season) {
    const labels = {
      spring: "봄",
      summer: "여름",
      autumn: "가을",
      winter: "겨울"
    };
    return labels[season] || season;
  }

  function applyThemeToPage(activeTheme) {
    const root = document.documentElement;
    root.style.setProperty("--bg-spot", activeTheme.palette.spot);
    root.style.setProperty("--bg-main", activeTheme.palette.bottom);
    root.style.setProperty("--accent", activeTheme.palette.accent);
    let holidayText = "";
    if (activeTheme.holiday) {
      holidayText = activeTheme.holiday.near > 0
        ? ` + ${activeTheme.holiday.name} 주간`
        : ` + ${activeTheme.holiday.name}`;
    }
    themeNameEl.textContent = `${seasonLabel(activeTheme.season)} / ${activeTheme.weather}${holidayText}`;
  }

  function getPlayerSideBoost() {
    const n = Number.parseFloat(boostInput.value);
    if (Number.isFinite(n) && n > 1) {
      return n;
    }
    boostInput.value = defaultBoost.toFixed(2);
    return defaultBoost;
  }

  function setOverlay(title, text, visible) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.toggle("show", visible);
  }

  function loadRanking() {
    try {
      const raw = localStorage.getItem(rankingStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      ranking = Array.isArray(parsed) ? uniqueAndSortRanking(parsed) : [];
    } catch {
      ranking = [];
    }
  }

  function saveRanking() {
    localStorage.setItem(rankingStorageKey, JSON.stringify(ranking.slice(0, 10)));
  }

  function uniqueAndSortRanking(rows) {
    const seen = new Set();
    const out = [];

    for (const row of rows) {
      if (!row || !Number.isFinite(row.returns) || typeof row.when !== "string") {
        continue;
      }
      const returns = Math.max(0, Math.floor(row.returns));
      const when = row.when.trim();
      const key = `${returns}|${when}`;
      if (when.length === 0 || seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({ returns, when });
    }

    out.sort((a, b) => {
      if (b.returns !== a.returns) {
        return b.returns - a.returns;
      }
      return b.when.localeCompare(a.when);
    });

    return out.slice(0, 10);
  }

  function showToast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "18px";
      el.style.transform = "translateX(-50%)";
      el.style.padding = "10px 14px";
      el.style.border = "1px solid rgba(148,163,184,0.45)";
      el.style.borderRadius = "10px";
      el.style.background = "rgba(15,23,42,0.9)";
      el.style.color = "#e2e8f0";
      el.style.zIndex = "9999";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      el.style.display = "none";
    }, 1400);
  }

  function renderRanking() {
    rankingListEl.innerHTML = "";
    if (ranking.length === 0) {
      const li = document.createElement("li");
      li.textContent = "아직 기록이 없습니다.";
      rankingListEl.appendChild(li);
      return;
    }

    ranking.slice(0, 10).forEach((row, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}위 - ${row.returns}회 (${row.when})`;
      rankingListEl.appendChild(li);
    });
  }

  function pushRanking(returns) {
    const stamp = new Date();
    const when = `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")} ${String(stamp.getHours()).padStart(2, "0")}:${String(stamp.getMinutes()).padStart(2, "0")}`;
    ranking = uniqueAndSortRanking([...ranking, { returns, when }]);
    saveRanking();
    renderRanking();
  }

  function updateHud() {
    returnCountEl.textContent = String(returnCount);
    bestCountEl.textContent = String(bestCount);
    speedMultEl.textContent = `x${speedMultiplier.toFixed(2).replace(/\.?0+$/, "")}`;
  }

  function resetRound(direction = Math.random() < 0.65 ? -1 : 1, resetRun = false) {
    player.y = H / 2 - player.h / 2;
    cpu.y = H / 2 - cpu.h / 2;

    ball.x = W / 2;
    ball.y = H / 2;

    if (resetRun) {
      returnCount = 0;
    }
    speedMultiplier = 1;
    updateHud();

    const angle = random(-0.45, 0.45);
    const speed = ball.baseSpeed;

    ball.vx = Math.cos(angle) * speed * direction;
    ball.vy = Math.sin(angle) * speed;
  }

  function startGame() {
    if (running) {
      return;
    }

    running = true;
    setOverlay("", "", false);

    if (ball.vx === 0 && ball.vy === 0) {
      resetRound(undefined, true);
    }

    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopGame() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function restartGame() {
    stopGame();
    resetRound(undefined, true);
    startGame();
  }

  function onGameOver() {
    stopGame();
    const msg = taunts[Math.floor(Math.random() * taunts.length)];
    if (returnCount > bestCount) {
      bestCount = returnCount;
    }
    pushRanking(returnCount);
    updateHud();
    setOverlay("GAME OVER", `${msg} | 이번 판 반환 ${returnCount}회`, true);
  }

  function paddleCollision(p) {
    const inX = ball.x + ball.r >= p.x && ball.x - ball.r <= p.x + p.w;
    const inY = ball.y + ball.r >= p.y && ball.y - ball.r <= p.y + p.h;
    return inX && inY;
  }

  function bounceFromPaddle(paddle, goingRightAfterBounce) {
    const rel = (ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2);
    const angle = rel * 0.9;
    const speed = Math.hypot(ball.vx, ball.vy);

    const dir = goingRightAfterBounce ? 1 : -1;
    ball.vx = Math.cos(angle) * speed * dir;
    ball.vy = Math.sin(angle) * speed;
  }

  function applyExactBoostWhenHeadingToPlayer() {
    const playerSideBoost = getPlayerSideBoost();
    speedMultiplier *= playerSideBoost;

    ball.vx *= playerSideBoost;
    ball.vy *= playerSideBoost;

    updateHud();
  }

  function updatePlayer(dt) {
    if (pointerActive) {
      player.y = clamp(pointerY - player.h / 2, 0, H - player.h);
      return;
    }

    let dir = 0;
    if (keys.up) {
      dir -= 1;
    }
    if (keys.down) {
      dir += 1;
    }

    player.y = clamp(player.y + dir * player.speed * dt, 0, H - player.h);
  }

  function updateCpu(dt) {
    const targetY = ball.y - cpu.h / 2;
    const delta = targetY - cpu.y;
    const follow = delta * cpu.aim;
    const maxStep = cpu.speed * dt;

    cpu.y = clamp(cpu.y + clamp(follow, -maxStep, maxStep), 0, H - cpu.h);
  }

  function updateBall(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy *= -1;
    }

    if (ball.y + ball.r > H) {
      ball.y = H - ball.r;
      ball.vy *= -1;
    }

    if (ball.vx < 0 && paddleCollision(player)) {
      ball.x = player.x + player.w + ball.r;
      bounceFromPaddle(player, true);
      returnCount += 1;
      if (returnCount > bestCount) {
        bestCount = returnCount;
      }
      updateHud();
    }

    if (ball.vx > 0 && paddleCollision(cpu)) {
      ball.x = cpu.x - ball.r;
      bounceFromPaddle(cpu, false);

      // 핵심 규칙: CPU 라켓에 맞아 공이 플레이어 쪽으로 향하는 순간 입력한 X배.
      applyExactBoostWhenHeadingToPlayer();
    }

    if (ball.x + ball.r < 0) {
      onGameOver();
    }

    if (ball.x - ball.r > W) {
      resetRound(-1);
    }
  }

  function drawNet() {
    ctx.save();
    ctx.strokeStyle = "rgba(226,232,240,0.4)";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.restore();
  }

  function drawObjects() {
    ctx.clearRect(0, 0, W, H);

    drawThemeBackdrop();
    drawNet();

    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(cpu.x, cpu.y, cpu.w, cpu.h);

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawThemeBackdrop() {
    const top = theme.palette.top;
    const bottom = theme.palette.bottom;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (theme.weather === "맑음") {
      drawSun();
    } else if (theme.weather === "비") {
      drawRain();
    } else if (theme.weather === "눈") {
      drawSnow();
    } else if (theme.weather === "바람") {
      drawWind();
    } else {
      drawClouds();
    }

    if (!theme.holiday) {
      return;
    }

    if (theme.holiday.overlay === "festivalLanterns") {
      drawFestivalLanterns();
    } else if (theme.holiday.overlay === "chuseokMoon") {
      drawChuseokMoon();
    } else if (theme.holiday.overlay === "autumnLeaves") {
      drawAutumnLeaves();
    } else if (theme.holiday.overlay === "easterEggs") {
      drawEasterEggs();
    } else if (theme.holiday.overlay === "carnivalConfetti") {
      drawCarnivalConfetti();
    } else if (theme.holiday.overlay === "forest") {
      drawForest();
    } else if (theme.holiday.overlay === "liberationBands") {
      drawLiberationBands();
    } else if (theme.holiday.overlay === "skyLanterns") {
      drawSkyLanterns();
    } else if (theme.holiday.overlay === "hangulGlyphs") {
      drawHangulGlyphs();
    } else if (theme.holiday.overlay === "fireworks") {
      drawFireworks();
    } else if (theme.holiday.overlay === "ribbons") {
      drawRibbons();
    } else if (theme.holiday.overlay === "halloween") {
      drawHalloween();
    } else if (theme.holiday.overlay === "christmas") {
      drawChristmas();
    }
  }

  function drawSun() {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(W * 0.85, H * 0.2, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRain() {
    ctx.save();
    ctx.strokeStyle = "rgba(191,219,254,0.5)";
    const t = performance.now() * 0.001;
    for (let i = 0; i < 50; i += 1) {
      const x = (i * 23 + (t * 300) % W) % W;
      const y = (i * 47 + (t * 220) % H) % H;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y + 18);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSnow() {
    ctx.save();
    ctx.fillStyle = "rgba(226,232,240,0.85)";
    const t = performance.now() * 0.0008;
    for (let i = 0; i < 44; i += 1) {
      const x = (i * 37 + (t * 140 + i * 13)) % W;
      const y = (i * 53 + (t * 200 + i * 7)) % H;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWind() {
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,0.45)";
    ctx.lineWidth = 2;
    const t = performance.now() * 0.002;
    for (let i = 0; i < 8; i += 1) {
      const y = 40 + i * 55 + Math.sin(t + i) * 10;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.bezierCurveTo(W * 0.3, y - 20, W * 0.6, y + 20, W - 20, y - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawClouds() {
    ctx.save();
    ctx.fillStyle = "rgba(203,213,225,0.3)";
    for (let i = 0; i < 7; i += 1) {
      const x = 80 + i * 130;
      const y = 70 + (i % 3) * 25;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.arc(x + 20, y - 8, 16, 0, Math.PI * 2);
      ctx.arc(x + 36, y, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawForest() {
    ctx.save();
    for (let i = 0; i < 14; i += 1) {
      const x = 20 + i * 70;
      const h = 30 + (i % 4) * 8;
      ctx.fillStyle = "#14532d";
      ctx.fillRect(x + 10, H - 25, 4, 18);
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.moveTo(x, H - 24);
      ctx.lineTo(x + 24, H - 24);
      ctx.lineTo(x + 12, H - 24 - h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLiberationBands() {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(W * 0.5 - 40, 18, 28, 40);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(W * 0.5 + 12, 18, 28, 40);
    ctx.restore();
  }

  function drawFestivalLanterns() {
    ctx.save();
    for (let i = 0; i < 8; i += 1) {
      const x = 60 + i * 120;
      ctx.strokeStyle = "rgba(251,191,36,0.7)";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 38);
      ctx.stroke();
      ctx.fillStyle = i % 2 === 0 ? "#f472b6" : "#fbbf24";
      ctx.beginPath();
      ctx.arc(x, 50, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawChuseokMoon() {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.2, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(30,41,59,0.35)";
    ctx.beginPath();
    ctx.ellipse(W * 0.8, H * 0.18, 10, 16, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAutumnLeaves() {
    ctx.save();
    const t = performance.now() * 0.001;
    for (let i = 0; i < 22; i += 1) {
      const x = (i * 43 + t * 60 + i * 17) % W;
      const y = (i * 37 + t * 28 + i * 11) % H;
      ctx.fillStyle = i % 2 === 0 ? "rgba(251,146,60,0.75)" : "rgba(245,158,11,0.75)";
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 4, (i % 5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEasterEggs() {
    ctx.save();
    const colors = ["#f9a8d4", "#93c5fd", "#86efac", "#fcd34d"];
    for (let i = 0; i < 10; i += 1) {
      const x = 60 + i * 90;
      const y = H - 40 - (i % 3) * 6;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.55)";
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCarnivalConfetti() {
    ctx.save();
    const colors = ["#f472b6", "#facc15", "#22d3ee", "#34d399"];
    const t = performance.now() * 0.001;
    for (let i = 0; i < 80; i += 1) {
      ctx.fillStyle = colors[i % colors.length];
      const x = (i * 29 + t * 100) % W;
      const y = (i * 47 + t * 60 + i * 13) % H;
      ctx.fillRect(x, y, 4, 8);
    }
    ctx.restore();
  }

  function drawSkyLanterns() {
    ctx.save();
    for (let i = 0; i < 10; i += 1) {
      const x = 60 + i * 95;
      const y = 40 + (i % 4) * 20;
      ctx.fillStyle = "rgba(251,191,36,0.7)";
      ctx.fillRect(x - 8, y, 16, 22);
      ctx.strokeStyle = "rgba(250,204,21,0.9)";
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 22);
      ctx.lineTo(x + 6, y + 22);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHangulGlyphs() {
    ctx.save();
    ctx.fillStyle = "rgba(191,219,254,0.26)";
    ctx.font = "bold 44px 'Malgun Gothic', sans-serif";
    const chars = ["ㅎ", "ㄱ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ"];
    for (let i = 0; i < 14; i += 1) {
      const x = 24 + i * 66;
      const y = 70 + (i % 3) * 40;
      ctx.fillText(chars[i % chars.length], x, y);
    }
    ctx.restore();
  }

  function drawFireworks() {
    ctx.save();
    const t = performance.now() * 0.002;
    for (let i = 0; i < 4; i += 1) {
      const cx = 120 + i * 220;
      const cy = 90 + (i % 2) * 70;
      const r = 24 + Math.sin(t + i) * 8;
      ctx.strokeStyle = "rgba(253,224,71,0.65)";
      for (let k = 0; k < 10; k += 1) {
        const a = (Math.PI * 2 * k) / 10;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawRibbons() {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#ef4444";
    for (let i = 0; i < 6; i += 1) {
      ctx.fillRect(0, 20 + i * 80, W, 22);
    }
    ctx.restore();
  }

  function drawHalloween() {
    ctx.save();
    ctx.fillStyle = "rgba(251,146,60,0.8)";
    for (let i = 0; i < 6; i += 1) {
      const x = 80 + i * 150;
      const y = H - 48;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(15,23,42,0.8)";
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 4);
      ctx.lineTo(x - 2, y - 10);
      ctx.lineTo(x - 2, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 4);
      ctx.lineTo(x + 2, y - 10);
      ctx.lineTo(x + 2, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + 6, 8, 0, Math.PI);
      ctx.strokeStyle = "rgba(15,23,42,0.85)";
      ctx.stroke();
      ctx.fillStyle = "rgba(251,146,60,0.8)";
    }
    ctx.restore();
  }

  function drawChristmas() {
    ctx.save();
    drawSnow();
    for (let i = 0; i < 5; i += 1) {
      const x = 90 + i * 180;
      ctx.fillStyle = "#166534";
      ctx.beginPath();
      ctx.moveTo(x, H - 34);
      ctx.lineTo(x + 26, H - 34);
      ctx.lineTo(x + 13, H - 84);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.fillRect(x + 11, H - 88, 4, 4);
    }
    ctx.restore();
  }

  function loop(timestamp) {
    if (!running) {
      return;
    }

    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;

    updatePlayer(dt);
    updateCpu(dt);
    updateBall(dt);
    drawObjects();

    rafId = requestAnimationFrame(loop);
  }

  function pointerToCanvasY(clientY) {
    const rect = canvas.getBoundingClientRect();
    return ((clientY - rect.top) / rect.height) * H;
  }

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();

    if (k === "arrowup" || k === "w") {
      keys.up = true;
      e.preventDefault();
    }

    if (k === "arrowdown" || k === "s") {
      keys.down = true;
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();

    if (k === "arrowup" || k === "w") {
      keys.up = false;
    }

    if (k === "arrowdown" || k === "s") {
      keys.down = false;
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    pointerActive = true;
    pointerY = pointerToCanvasY(e.clientY);
  });

  canvas.addEventListener("mouseleave", () => {
    pointerActive = false;
  });

  canvas.addEventListener("touchstart", (e) => {
    pointerActive = true;
    pointerY = pointerToCanvasY(e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    pointerActive = true;
    pointerY = pointerToCanvasY(e.touches[0].clientY);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchend", () => {
    pointerActive = false;
  });

  startBtn.addEventListener("click", () => {
    if (ball.vx === 0 && ball.vy === 0) {
      resetRound(undefined, true);
    }
    startGame();
  });

  restartBtn.addEventListener("click", () => {
    restartGame();
  });

  unfairBtn.addEventListener("click", () => {
    cpu.h = clamp(cpu.h + 40, 260, H - 10);
    cpu.y = clamp(cpu.y, 0, H - cpu.h);
    cpu.aim = clamp(cpu.aim + 0.03, 0.84, 0.98);

    if (!running) {
      setOverlay("더 킹받게 적용됨", "CPU가 더 커지고 더 정확해졌습니다.", true);
    }
  });

  exportRankingBtn.addEventListener("click", () => {
    const data = localStorage.getItem(rankingStorageKey) || "[]";
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ranking.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("내보내기 완료");
  });

  importRankingBtn.addEventListener("click", () => {
    importRankingInput.click();
  });

  importRankingInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const incoming = JSON.parse(text);
      if (!Array.isArray(incoming)) {
        throw new Error("invalid format");
      }

      ranking = uniqueAndSortRanking([...ranking, ...incoming]);
      saveRanking();
      bestCount = ranking.length > 0 ? ranking[0].returns : Math.max(bestCount, returnCount);
      renderRanking();
      updateHud();
      showToast("가져오기 완료");
    } catch {
      showToast("가져오기 실패");
    } finally {
      importRankingInput.value = "";
    }
  });

  theme = buildTheme(new Date());
  applyThemeToPage(theme);

  loadRanking();
  bestCount = ranking.length > 0 ? ranking[0].returns : 0;
  renderRanking();

  updateHud();
  drawObjects();
})();
