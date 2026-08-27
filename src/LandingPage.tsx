import { useRef, useState } from "react";
import "./landing.css";

type LandingPageProps = {
  onOpenRouting: () => void;
  onOpenAdmin: () => void;
};

const workflowSteps = [
  {
    number: "01",
    title: "Выберите территорию",
    text: "Укажите район или городской округ, откуда бригада забирает пациента.",
  },
  {
    number: "02",
    title: "Отметьте клинические критерии",
    text: "Ответьте только на вопросы выбранного медицинского профиля.",
  },
  {
    number: "03",
    title: "Получите пункт назначения",
    text: "Система покажет медицинскую организацию, город, адрес и необходимые действия СМП.",
  },
];

const capabilities = [
  {
    marker: "A",
    title: "Шесть профилей",
    text: "Акушерство, онкология, БСК, дерматовенерология, инфекции и ДТП.",
  },
  {
    marker: "B",
    title: "Конкретный результат",
    text: "Не абстрактное направление, а конечная медицинская организация с адресом.",
  },
  {
    marker: "C",
    title: "Нормативная основа",
    text: "У маршрута сохраняется связь с приказами и официальными источниками.",
  },
  {
    marker: "D",
    title: "Управляемая логика",
    text: "Администратор может менять вопросы, условия, переходы и результаты веток.",
  },
  {
    marker: "E",
    title: "Версии и контроль",
    text: "Черновики сравниваются с действующей версией до публикации изменений.",
  },
  {
    marker: "F",
    title: "Обратная связь",
    text: "Врач может сообщить об ошибке или предложить уточнение прямо из профиля.",
  },
];

export default function LandingPage({
  onOpenRouting,
  onOpenAdmin,
}: LandingPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(false);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      setVideoPaused(false);
    } else {
      video.pause();
      setVideoPaused(true);
    }
  };

  return (
    <main className="landing-page">
      <header className="landing-header" aria-label="Навигация по проекту">
        <a className="landing-brand" href="#top" aria-label="К началу страницы">
          <span className="landing-brand__mark">СММ</span>
          <span>
            <strong>Система медицинской маршрутизации</strong>
            <small>Новгородская область</small>
          </span>
        </a>

        <nav className="landing-nav" aria-label="Разделы страницы">
          <a href="#about">О проекте</a>
          <a href="#how-it-works">Как работает</a>
          <a href="#team">Команда</a>
        </nav>

        <div className="landing-header__actions">
          <button
            className="landing-link-button"
            type="button"
            onClick={onOpenAdmin}
          >
            Для администратора
          </button>
          <button
            className="landing-button landing-button--compact"
            type="button"
            onClick={onOpenRouting}
          >
            Открыть систему <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <section className="landing-hero" id="top">
        <div className="landing-hero__copy">
          <p className="landing-eyebrow">Цифровой помощник для бригад СМП</p>
          <h1>
            Маршрут пациента —
            <span>по клиническим критериям</span>
          </h1>
          <p className="landing-lead">
            Врач выбирает территорию вызова и выявленные признаки. Система
            последовательно применяет правила маршрутизации и показывает, в
            какую медицинскую организацию доставить пациента.
          </p>

          <div className="landing-hero__actions">
            <button className="landing-button" type="button" onClick={onOpenRouting}>
              Начать маршрутизацию <span aria-hidden="true">→</span>
            </button>
            <a className="landing-text-link" href="#how-it-works">
              Посмотреть, как это работает
            </a>
          </div>

          <dl className="landing-facts" aria-label="Ключевые показатели проекта">
            <div>
              <dt>6</dt>
              <dd>медицинских профилей</dd>
            </div>
            <div>
              <dt>1</dt>
              <dd>конкретный маршрут в результате</dd>
            </div>
            <div>
              <dt>24/7</dt>
              <dd>доступ с телефона или компьютера</dd>
            </div>
          </dl>
        </div>

        <div className="landing-hero__visual">
          <div className="landing-video-shell">
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              poster="/media/project-poster.webp"
              aria-label="Иллюстрация работы системы медицинской маршрутизации"
            >
              <source src="/media/project-loop.mp4" type="video/mp4" />
            </video>
            <div className="landing-video-shell__topline">
              <span>
                <i aria-hidden="true" /> Маршрут формируется
              </span>
              <button
                className="landing-video-control"
                type="button"
                onClick={toggleVideo}
                aria-label={videoPaused ? "Воспроизвести видео" : "Остановить видео"}
              >
                {videoPaused ? "▶" : "Ⅱ"}
              </button>
            </div>
            <div className="landing-route-card">
              <small>Пункт назначения</small>
              <strong>Профильный стационар определён</strong>
              <span>Город и адрес доступны в результате маршрута</span>
            </div>
          </div>
          <p className="landing-video-caption">
            Видео воспроизводится без звука и не содержит медицинских инструкций
          </p>
        </div>
      </section>

      <section className="landing-section landing-story" id="about">
        <div>
          <p className="landing-section__label">О проекте</p>
          <h2 className="landing-section__heading">
            Сложные приказы превращаются в последовательный маршрут
          </h2>
        </div>
        <div className="landing-story__copy">
          <p className="landing-kicker">
            В экстренной ситуации врачу не нужно заново сопоставлять территорию,
            симптомы и таблицы маршрутизации.
          </p>
          <div className="landing-story__columns">
            <p>
              Мы переносим утверждённые критерии в управляемые опросники. Каждый
              ответ влияет на дальнейшие вопросы и на конечный пункт назначения.
            </p>
            <p>
              Система не ставит диагноз и не заменяет решение медицинского
              работника. Она помогает быстро применить действующие правила и не
              потерять важное условие маршрута.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-workflow" id="how-it-works">
        <div className="landing-workflow__intro">
          <p className="landing-section__label">Как это работает</p>
          <h2 className="landing-section__heading">Три шага до понятного результата</h2>
        </div>

        <ol className="landing-steps">
          {workflowSteps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="landing-example">
          <div className="landing-example__scenario">
            <p className="landing-example__label">Пример прохождения</p>
            <h3>Подозрение на острое нарушение мозгового кровообращения</h3>
            <dl>
              <div>
                <dt>Территория</dt>
                <dd>Великий Новгород</dd>
              </div>
              <div>
                <dt>Профиль</dt>
                <dd>БСК / сердечно-сосудистые заболевания</dd>
              </div>
              <div>
                <dt>Критерии</dt>
                <dd>Нарушение речи и слабость руки</dd>
              </div>
            </dl>
          </div>
          <div className="landing-example__result">
            <span>Результат маршрутизации</span>
            <strong>ГОБУЗ «Новгородская областная клиническая больница»</strong>
            <p>Великий Новгород, ул. Павла Левитта, д. 14</p>
            <small>
              Демонстрационный пример интерфейса, не медицинская рекомендация
            </small>
          </div>
        </div>
      </section>

      <section className="landing-section landing-capabilities">
        <div className="landing-capabilities__intro">
          <p className="landing-section__label">Что уже реализовано</p>
          <h2 className="landing-section__heading">
            Не статичная памятка, а управляемая система
          </h2>
          <p>
            Маршруты можно поддерживать в актуальном состоянии без переделки
            всего приложения.
          </p>
        </div>
        <div className="landing-capability-grid">
          {capabilities.map((item) => (
            <article key={item.marker}>
              <span>{item.marker}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-team" id="team">
        <div className="landing-team__heading">
          <p className="landing-section__label">Команда</p>
          <h2 className="landing-section__heading">
            Медицинская экспертиза и продуктовая разработка
          </h2>
        </div>

        <div className="landing-team-grid">
          <article className="landing-person">
            <img
              src="/team/oleg-moshchin.jpg"
              alt="Милютин Валентин Михайлович"
            />
            <div>
              <p>Руководитель проекта</p>
              <h3>Милютин Валентин Михайлович</h3>
              <span>
                Генеральный директор ООО «Система Медицинской Маршрутизации».
                Отвечает за продукт, архитектуру, разработку и запуск системы.
              </span>
            </div>
          </article>

          <article className="landing-person">
            <img
              className="landing-person__photo--oleg"
              src="/team/valentin-milyutin.jpg"
              alt="Мощин Олег"
            />
            <div>
              <p>Медицинский специалист</p>
              <h3>Мощин Олег</h3>
              <span>
                Инициатор медицинского направления. Отвечает за методологию,
                анализ правил маршрутизации и работу с профильными специалистами.
              </span>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section landing-support">
        <div className="landing-support__logos" aria-label="Организации поддержки">
          <a href="https://fasie.ru/" target="_blank" rel="noreferrer">
            <img src="/brand/fasie-logo.png" alt="Фонд содействия инновациям" />
          </a>
          <a href="https://univertechpred.ru/" target="_blank" rel="noreferrer">
            <img
              src="/brand/platform-logo.svg"
              alt="Платформа университетского технологического предпринимательства"
            />
          </a>
        </div>
        <div>
          <p className="landing-section__label">Поддержка проекта</p>
          <p className="landing-support__text">
            Проект реализован при поддержке Фонда содействия инновациям в рамках
            программы «Студенческий стартап» мероприятия «Платформа
            университетского технологического предпринимательства» федерального
            проекта «Технологии».
          </p>
        </div>
      </section>

      <section className="landing-final">
        <div>
          <p>Система готова к работе</p>
          <h2>От критерия — к конкретному месту госпитализации</h2>
        </div>
        <div className="landing-final__actions">
          <button className="landing-button" type="button" onClick={onOpenRouting}>
            Открыть маршрутизацию <span aria-hidden="true">→</span>
          </button>
          <button
            className="landing-final__admin"
            type="button"
            onClick={onOpenAdmin}
          >
            Войти в администрирование
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>ООО «Система Медицинской Маршрутизации»</strong>
          <span>Новгородская область · 2026</span>
        </div>
        <a href="#top">Наверх ↑</a>
      </footer>
    </main>
  );
}
