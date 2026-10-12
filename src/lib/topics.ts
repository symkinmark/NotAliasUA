import type { Language } from "../i18n/translations";

export const topicIds = [
  "nature", "food", "home", "city", "body", "people", "work", "sport",
  "culture", "science", "law", "military", "news", "ukraine", "abstract",
  // New ids are only ever appended: saved topic selections reference these strings.
  "milftech", "realpolitik", "cancelled",
  "memes", "history", "gender", "swears", "bees", "drones", "portugal", "jewish", "medical", "biology", "art", "zizek", "soviet",
] as const;

export type TopicId = typeof topicIds[number];

export const topicEmoji: Record<TopicId, string> = {
  nature: "🐾", food: "🍎", home: "🏠", city: "🚌", body: "🧍",
  people: "🧑", work: "💼", sport: "⚽", culture: "🎭", science: "🔬",
  law: "⚖️", military: "🪖", news: "📰", ukraine: "🇺🇦", abstract: "💭",
  milftech: "🚀", realpolitik: "♟️", cancelled: "🚫",
  memes: "🫡", history: "🏛️", gender: "🏳️‍🌈", swears: "🤬", bees: "🐝", drones: "🔧", portugal: "🇵🇹", jewish: "✡️", medical: "🤒", biology: "🧬", art: "🎨", zizek: "🤔", soviet: "📻",
};

const names: Record<Language, Record<TopicId, string>> = {
  uk: {
    nature: "Тварини і природа", food: "Їжа і напої", home: "Дім і побут",
    city: "Транспорт і місто", body: "Тіло і здоров'я", people: "Люди",
    work: "Робота і гроші", sport: "Спорт та ігри", culture: "Культура",
    science: "Наука і техніка", law: "Право і злочини", military: "Військове",
    news: "Новини і політика", ukraine: "Україна і свята", abstract: "Абстрактне",
    milftech: "MILFtech", realpolitik: "Реалполітик", cancelled: "Закенселені",
    memes: "Мемчики",
    history: "Історія і філософія",
    gender: "Фемінізм і ЛГБТ",
    swears: "Стара лайка",
    bees: "Бджільництво",
    drones: "Збери дрон",
    portugal: "Португалія",
    jewish: "Єврейське",
    medical: "Хвороби",
    biology: "Біологія",
    art: "Мистецтво",
    zizek: "Жижек і Харарі",
    soviet: "Совок",
  },
  en: {
    nature: "Animals & nature", food: "Food & drink", home: "Home & things",
    city: "Transport & city", body: "Body & health", people: "People",
    work: "Work & money", sport: "Sport & games", culture: "Culture",
    science: "Science & tech", law: "Law & crime", military: "Military",
    news: "News & politics", ukraine: "Ukraine & holidays", abstract: "Abstract",
    milftech: "MILFtech", realpolitik: "Realpolitik", cancelled: "Cancelled",
    memes: "Ukrainian memes",
    history: "History & philosophy",
    gender: "Feminism & LGBT",
    swears: "Old-school swearing",
    bees: "Beekeeping",
    drones: "Drone parts",
    portugal: "Portugal",
    jewish: "Jewish words",
    medical: "Medical conditions",
    biology: "Biology",
    art: "Art & theory",
    zizek: "Žižek & Harari",
    soviet: "Soviet relics",
  },
  ru: {
    nature: "Животные и природа", food: "Еда и напитки", home: "Дом и быт",
    city: "Транспорт и город", body: "Тело и здоровье", people: "Люди",
    work: "Работа и деньги", sport: "Спорт и игры", culture: "Культура",
    science: "Наука и техника", law: "Право и преступления", military: "Военное",
    news: "Новости и политика", ukraine: "Украина и праздники", abstract: "Абстрактное",
    milftech: "MILFtech", realpolitik: "Реалполитик", cancelled: "Отменённые",
    memes: "Мемы",
    history: "История и философия",
    gender: "Феминизм и ЛГБТ",
    swears: "Старая брань",
    bees: "Пчеловодство",
    drones: "Собери дрон",
    portugal: "Португалия",
    jewish: "Еврейское",
    medical: "Болезни",
    biology: "Биология",
    art: "Искусство",
    zizek: "Жижек и Харари",
    soviet: "Совок",
  },
};

export function topicName(id: TopicId, language: Language): string {
  return names[language][id];
}
