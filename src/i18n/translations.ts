export const languages = ["uk", "en", "ru"] as const;
export type Language = typeof languages[number];

export const languageNames: Record<Language, string> = {
  uk: "Українська",
  en: "English",
  ru: "Русский",
};

const translations = {
  uk: {
    appTitle: "Аліас",
    secondsPerRound: "Секунд на раунд",
    start: "Старт!",
    skip: "Пропустити",
    correct: "Вгадано",
    score: "Рахунок:",
    playAgain: "Ще раз!",
    quit: "Вийти",
    settings: "Налаштування",
    language: "Мова та слова",
    back: "Назад",
    appVersion: "Версія застосунку",
  },
  en: {
    appTitle: "Alias game",
    secondsPerRound: "Seconds per round",
    start: "Start!",
    skip: "Skip",
    correct: "Correct",
    score: "Score:",
    playAgain: "Play again!",
    quit: "Quit",
    settings: "Settings",
    language: "Language & words",
    back: "Back",
    appVersion: "App version",
  },
  ru: {
    appTitle: "Алиас",
    secondsPerRound: "Секунд на раунд",
    start: "Старт!",
    skip: "Пропуск",
    correct: "Верно",
    score: "Счёт:",
    playAgain: "Ещё раз!",
    quit: "Выход",
    settings: "Настройки",
    language: "Язык и слова",
    back: "Назад",
    appVersion: "Версия приложения",
  },
} as const;

export type TranslationKey = keyof typeof translations["uk"];

export function getTranslations(lang: Language) {
  return translations[lang];
}
