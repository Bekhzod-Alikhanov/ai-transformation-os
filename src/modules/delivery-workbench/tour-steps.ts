import type { ProjectId } from "./model";

export type TourLanguage = "ru" | "en";
type TourCopy = {
  title: string;
  action: string;
  say: string;
  takeaway: string;
};
type TourStep = {
  project: ProjectId;
  section: number;
  target: string;
  minutes: string;
  ru: TourCopy;
  en: TourCopy;
};

// Navigation and presentation copy only. No project mutations or action execution.
export const tourSteps: readonly TourStep[] = [
  {
    project: "support",
    section: 0,
    target: "brief",
    minutes: "0:00–0:35",
    ru: {
      title: "Проблема клиента и цель проекта",
      action:
        "Покажи цель Support Operations и ключевые показатели. Объясни, что Aster — синтетический клиент, а цифры — прогноз по допущениям.",
      say: "Я построил этот прототип, чтобы связать AI-идею с инвестиционным решением и измеримым результатом. Начинаем не с модели, а с проблемы клиента: сколько времени теряется, что хотим улучшить и кто отвечает за результат.",
      takeaway: "Не демонстрация чат-бота, а управление результатом внедрения.",
    },
    en: {
      title: "The client problem and project objective",
      action:
        "Show the Support Operations objective and headline metrics. Aster is a synthetic client; the figures are assumption-based projections.",
      say: "I built this prototype to connect an AI idea to an investment decision and a measurable outcome. We start with the client problem, not the model: where time is lost, what should improve, and who owns the result.",
      takeaway:
        "This is about delivery accountability, not just demonstrating a chatbot.",
    },
  },
  {
    project: "support",
    section: 1,
    target: "evidence",
    minutes: "0:35–1:10",
    ru: {
      title: "Проверить доказательства, а не поверить цифрам",
      action:
        "Выбери Adoption needs validation. Прочитай противоречие. Введи Review rationale: «Use 70% as a pilot hypothesis; validate with weekly adoption reviews.» Затем нажми Accept evidence, если готов принять это как проверяемое допущение.",
      say: "Здесь можно проследить источник каждого важного допущения. Оценка adoption в бизнес-кейсе расходится с интервью сотрудников. Я фиксирую, что именно принимаю для пилота и как проверю это, а не скрываю противоречие.",
      takeaway: "Принятое допущение ещё не является доказанным результатом.",
    },
    en: {
      title: "Review evidence instead of trusting a headline",
      action:
        "Select Adoption needs validation. Enter Review rationale: “Use 70% as a pilot hypothesis; validate with weekly adoption reviews.” Click Accept evidence if you accept it as a testable planning assumption.",
      say: "We can trace the source behind an important assumption. The business case adoption estimate conflicts with employee interviews. I record what we accept for the pilot and how we will validate it, rather than hiding the uncertainty.",
      takeaway: "An accepted planning assumption is not a proven outcome.",
    },
  },
  {
    project: "support",
    section: 2,
    target: "options",
    minutes: "1:10–1:40",
    ru: {
      title: "Сравнить AI с более простыми альтернативами",
      action:
        "Выбери Broad automation и покажи отрицательный NPV и рекомендацию Stop. Затем вернись к Assisted copilot. Process & rules показывает вариант без сложной AI-автоматизации. Выбор другого варианта загружает его шаблон допущений.",
      say: "Я не предполагаю, что AI всегда лучшее решение. Мы сравниваем улучшение процесса, ограниченный copilot и широкую автоматизацию. Дорогой вариант нужно отклонить, если его экономика не оправдывает инвестиции.",
      takeaway: "Умение сказать «не внедрять» — часть роли delivery manager.",
    },
    en: {
      title: "Compare AI with simpler alternatives",
      action:
        "Select Broad automation to show negative NPV and Stop, then return to Assisted copilot. Process & rules is the lower-complexity alternative. Selecting another option loads its costed assumption template.",
      say: "I do not assume AI is always the best answer. We compare process improvement, a bounded copilot and broad automation. The expensive option should be rejected if its economics do not justify investment.",
      takeaway: "Knowing when not to build is part of delivery leadership.",
    },
  },
  {
    project: "support",
    section: 2,
    target: "economics",
    minutes: "1:40–2:15",
    ru: {
      title: "Показать экономику без двойного счёта",
      action:
        "Покажи часы и FTE capacity, Initial investment, Annual OPEX, ROI и payback. Ниже сравни Economic NPV и Cash-only NPV; при необходимости прокрути к The value bridge.",
      say: "Модель учитывает объём работы, время, human review, adoption и постепенный выход на мощность. Высвобождённые часы — это ресурс, а не автоматическое сокращение штата. Денежная экономия выделена отдельно и требует подтверждения финансовой командой.",
      takeaway: "Capacity value и реальные cash savings — разные показатели.",
    },
    en: {
      title: "Explain the economics without double counting",
      action:
        "Show hours, FTE capacity, investment, annual OPEX, ROI and payback. Scroll to The value bridge to compare economic NPV with cash-only NPV.",
      say: "The model accounts for workload, time, human review, adoption and ramp-up. Released hours represent capacity, not automatic job reductions. Cash savings are a separate subset that finance must validate through a concrete realization mechanism.",
      takeaway: "Capacity value is not the same as cash savings.",
    },
  },
  {
    project: "support",
    section: 2,
    target: "assumptions",
    minutes: "2:15–2:50",
    ru: {
      title: "Изменить допущение прямо во время разговора",
      action:
        "Измени Initial investment на 40000 и нажми Save assumptions. Прокрути вверх к пересчитанным показателям. Ниже доступны сценарии, sensitivity и Run uncertainty analysis; это необязательное углубление.",
      say: "Если клиент меняет бюджет или прогноз adoption, мы пересчитываем кейс, а не редактируем слайд вручную. Формулы детерминированы. Анализ неопределённости показывает диапазон исходов при заданных допущениях, а не гарантирует результат.",
      takeaway: "Живая модель помогает обсуждать последствия решений.",
    },
    en: {
      title: "Change an assumption during the conversation",
      action:
        "Set Initial investment to 40000 and click Save assumptions. Scroll up to the recalculated metrics. Scenarios, sensitivity and Run uncertainty analysis are available below as an optional deep dive.",
      say: "If the client changes the budget or adoption forecast, we recalculate the case rather than manually editing a slide. The formulas are deterministic. Uncertainty analysis shows a range under specified assumptions; it is not a guarantee.",
      takeaway: "A live model makes the consequences of decisions discussable.",
    },
  },
  {
    project: "support",
    section: 3,
    target: "evaluation",
    minutes: "2:50–3:30",
    ru: {
      title: "Проверить AI-результат и границы автономности",
      action:
        "Нажми Run evaluation. Для примеров прокрути выше: выбери неавторизованный платёж или неподтверждённую ссылку. Покажи неверное предложение и необходимую проверку человеком.",
      say: "Эти примеры подготовлены заранее и не являются live AI. Они демонстрируют, как я проверяю качество, ссылки и опасные ошибки. Успешная демонстрация ещё не даёт оснований для автономного исполнения; human review включён в процесс и стоимость.",
      takeaway:
        "Оценка качества и контроль рисков — часть решения, а не приложение к нему.",
    },
    en: {
      title: "Evaluate output and define autonomy boundaries",
      action:
        "Click Run evaluation. Scroll up and inspect the unauthorized-payment example or unsupported citation. Show the incorrect suggestion and the required human correction.",
      say: "These are authored fixtures, not live AI. They demonstrate how I evaluate quality, citations and consequential errors. A successful demo does not justify autonomous execution. Human review is built into both the workflow and its cost.",
      takeaway:
        "Evaluation and risk controls are part of the design, not an afterthought.",
    },
  },
  {
    project: "support",
    section: 4,
    target: "delivery",
    minutes: "3:30–4:00",
    ru: {
      title: "Управлять сроками, зависимостями и рисками",
      action:
        "Покажи 90-дневный план и владельцев задач. Ниже — риск-регистр и бюджет. По желанию покажи 10-дневную задержку данных: это изменит локальный план. Для свободного обсуждения можно поставить тур на паузу.",
      say: "Моя задача — не только довести модель до пилота, но и управлять зависимостями, доступом к данным, бюджетом и изменениями. У каждого риска есть владелец. Задержка входных данных должна отражаться в плане, а не только в статусном письме.",
      takeaway:
        "Платформа делает ответственность и последствия задержек видимыми.",
    },
    en: {
      title: "Manage dependencies, budget and delivery risk",
      action:
        "Show the 90-day milestones and owners, then the risk register and budget below. Optionally apply the 10-day data delay; this changes the local plan. Pause the tour for a free-form discussion.",
      say: "My role is not only to get a model into a pilot. It is to manage dependencies, data access, budget and change. Every risk needs an owner. A data delay should alter the plan, not just appear in a status email.",
      takeaway: "Accountability and the consequences of delays remain visible.",
    },
  },
  {
    project: "support",
    section: 5,
    target: "pilot",
    minutes: "4:00–4:40",
    ru: {
      title: "Показать неудачный adoption, а не идеальную историю",
      action:
        "Нажми Load adoption setback, затем Save measurements. Сравни наблюдения с порогами. После проверки evidence и evaluation рекомендация будет Fix при этом сценарии. Если изменил другие параметры, объясни фактически показанную рекомендацию.",
      say: "Качество может пройти порог, но использование остаться на уровне 38%. Я не буду масштабировать проект только потому, что технология работает. Нужны защищённое время на обучение, владелец adoption и ограниченный срок для повторной проверки.",
      takeaway:
        "Результат внедрения зависит от принятия пользователями, а не только от точности модели.",
    },
    en: {
      title: "Show an adoption setback, not a perfect story",
      action:
        "Click Load adoption setback, then Save measurements. Compare observations with the thresholds. With reviewed evidence and a current evaluation, this scenario recommends Fix. If you changed other inputs, explain the recommendation actually shown.",
      say: "Quality may pass while adoption remains at 38%. I would not scale simply because the technology works. We need protected training time, an accountable adoption owner and a time-boxed reassessment.",
      takeaway:
        "Implementation value depends on adoption, not just model accuracy.",
    },
  },
  {
    project: "support",
    section: 5,
    target: "decision",
    minutes: "4:40–5:20",
    ru: {
      title: "Зафиксировать решение и передать его спонсору",
      action:
        "Выбери решение по текущим условиям, укажи rationale, conditions, владельца и дату follow-up. Если решение отличается от рекомендации, объясни override. Нажми Record decision. Ниже покажи историю; сверху Decision brief и Export steering pack выгружают текущий кейс.",
      say: "Рекомендация системы не заменяет ответственного руководителя. Здесь сохраняются человеческое решение, условия и снимок допущений. Следующая версия не переписывает прошлое решение. Спонсор получает документ, отражающий текущее состояние кейса.",
      takeaway:
        "Решение, ответственность и последующие действия должны быть прослеживаемыми.",
    },
    en: {
      title: "Record the decision and brief the sponsor",
      action:
        "Choose a decision supported by the current gates. Enter rationale, conditions, owner and follow-up date; explain an override if needed. Click Record decision. Inspect history below; Decision brief and Export steering pack at the top export the current case.",
      say: "A system recommendation does not replace the accountable leader. We preserve the human decision, conditions and assumption snapshot. A later revision does not rewrite that decision. The sponsor receives a brief reflecting the current engagement state.",
      takeaway: "Decisions need traceable ownership, conditions and follow-up.",
    },
  },
  {
    project: "reporting",
    section: 3,
    target: "examples",
    minutes: "5:20–6:00",
    ru: {
      title: "Второй проект: другая ценность, те же принципы",
      action:
        "В Executive Reporting выбери пример с конфликтующими цифрами Finance export. Покажи ошибочное Publish и требование Reconcile. После завершения тура открой Business case: здесь не предполагаются прямые cash savings.",
      say: "Второй кейс — подготовка управленческой отчётности. Здесь главный риск — убедительный текст с неверной цифрой. До публикации нужно согласовать источник истины и получить проверку владельца. Экономия времени есть, но денежную экономию мы не приписываем без основания.",
      takeaway:
        "Один подход к delivery, но разные риски и механизмы создания ценности.",
    },
    en: {
      title: "A second project: different value, the same discipline",
      action:
        "In Executive Reporting, select the conflicting Finance export example. Show the incorrect Publish suggestion and required Reconcile outcome. After the tour, open Business case: no direct cash savings are assumed here.",
      say: "The second case is management reporting. The central risk is a persuasive narrative containing the wrong figure. Before publication, we reconcile the source of truth and require accountable review. There is time value, but we do not invent a cash-saving mechanism.",
      takeaway:
        "A consistent delivery discipline adapts to different risks and value mechanisms.",
    },
  },
];
