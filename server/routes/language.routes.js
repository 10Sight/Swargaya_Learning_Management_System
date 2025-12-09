import express from "express";

const router = express.Router();

// Keep this in sync with the frontend translations where possible.
const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
  { code: "ru", name: "Russian" },
];

const BASE_TRANSLATIONS = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.instructors": "Instructors",
    "nav.courses": "Courses",
    "nav.batches": "Batches",
    "nav.students": "Students",
  },
  hi: {
    "nav.dashboard": "डैशबोर्ड",
    "nav.instructors": "प्रशिक्षक",
    "nav.courses": "कोर्स",
    "nav.batches": "बैच",
    "nav.students": "छात्र",
  },
  ja: {
    "nav.dashboard": "ダッシュボード",
    "nav.instructors": "講師",
    "nav.courses": "コース",
    "nav.batches": "バッチ",
    "nav.students": "受講者",
  },
  zh: {
    "nav.dashboard": "仪表盘",
    "nav.instructors": "讲师",
    "nav.courses": "课程",
    "nav.batches": "批次",
    "nav.students": "学员",
  },
  ru: {
    "nav.dashboard": "Панель",
    "nav.instructors": "Преподаватели",
    "nav.courses": "Курсы",
    "nav.batches": "Группы",
    "nav.students": "Студенты",
  },
};

// GET /api/languages - list supported languages
router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    data: SUPPORTED_LANGUAGES,
  });
});

// GET /api/languages/:code - minimal translation map for the given language
router.get("/:code", (req, res) => {
  const code = req.params.code?.toLowerCase();
  if (!code || !BASE_TRANSLATIONS[code]) {
    return res.status(404).json({
      success: false,
      message: "Language not supported",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      code,
      translations: BASE_TRANSLATIONS[code],
    },
  });
});

export default router;
