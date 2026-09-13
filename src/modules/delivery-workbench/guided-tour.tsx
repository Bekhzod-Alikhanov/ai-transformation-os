"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, X } from "lucide-react";
import { tourSteps, type TourLanguage } from "./tour-steps";
import "./guided-tour.css";

export function GuidedTour({
  index,
  paused,
  language,
  onMove,
  onPause,
  onResume,
  onClose,
  onLanguage,
}: {
  index: number;
  paused: boolean;
  language: TourLanguage;
  onMove: (index: number) => void;
  onPause: () => void;
  onResume: () => void;
  onClose: () => void;
  onLanguage: (language: TourLanguage) => void;
}) {
  const step = tourSteps[index]!;
  const copy = step[language];
  const ru = language === "ru";
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (paused) return;
    const target = document.querySelector<HTMLElement>(
      `[data-tour="${step.target}"]`,
    );
    target?.classList.add("dw-tour-highlight");
    target?.scrollIntoView?.({ block: "start", behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
    return () => target?.classList.remove("dw-tour-highlight");
  }, [step, paused]);
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        (event.target instanceof Element &&
          event.target.closest('[role="dialog"]'))
      )
        return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  return (
    <section
      className={"dw-tour " + (paused ? "is-paused" : "")}
      aria-label={ru ? "Тур по платформе" : "Platform tour"}
      lang={language}
    >
      <div className="dw-tour-top">
        <span>{ru ? "ТУР ПО ПЛАТФОРМЕ" : "GUIDED PRESENTATION"}</span>
        <div className="dw-actions">
          <div className="dw-tour-languages">
            <button
              aria-label="Русский"
              aria-pressed={ru}
              onClick={() => onLanguage("ru")}
            >
              RU
            </button>
            <button
              aria-label="English"
              aria-pressed={!ru}
              onClick={() => onLanguage("en")}
            >
              EN
            </button>
          </div>
          <button
            className="dw-tour-icon"
            aria-label={ru ? "Закрыть тур" : "Close tour"}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div
        className="dw-tour-progress"
        role="progressbar"
        aria-label={ru ? "Прогресс тура" : "Tour progress"}
        aria-valuemin={1}
        aria-valuemax={tourSteps.length}
        aria-valuenow={index + 1}
      >
        <span style={{ width: `${((index + 1) * 100) / tourSteps.length}%` }} />
      </div>
      <p className="dw-tour-count" aria-live="polite">
        {ru ? "Шаг" : "Step"} {index + 1} / {tourSteps.length} ·{" "}
        {paused ? (ru ? "Пауза" : "Paused") : step.minutes}
      </p>
      <h2 ref={heading} tabIndex={-1}>
        {copy.title}
      </h2>
      {paused ? (
        <p className="dw-tour-paused-note">
          {ru
            ? "Можно свободно работать в платформе. Продолжение вернёт к этому шагу без сброса данных."
            : "Explore the platform freely. Resume returns to this step without resetting your data."}
        </p>
      ) : (
        <>
          <div className="dw-tour-content">
            <h3>{ru ? "Что показать" : "What to show"}</h3>
            <p>{copy.action}</p>
          </div>
          <details className="dw-tour-script" open>
            <summary>{ru ? "Что сказать" : "What to say"}</summary>
            <blockquote>{copy.say}</blockquote>
          </details>
          <p className="dw-tour-takeaway">
            <strong>{ru ? "Главная мысль" : "Key takeaway"}</strong>
            {copy.takeaway}
          </p>
          <p className="dw-tour-boundary">
            {ru
              ? "Подсказки видны при показе экрана. Тур не редактирует данные и не выполняет действия за тебя."
              : "Notes are visible when sharing this screen. The tour never edits records or performs actions for you."}
          </p>
        </>
      )}
      <div className="dw-tour-controls">
        {paused ? (
          <button className="dw-btn primary" onClick={onResume}>
            <Play size={14} />
            {ru ? "Продолжить тур" : "Resume tour"}
          </button>
        ) : (
          <>
            <button
              className="dw-btn"
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
              aria-label={ru ? "Назад" : "Previous step"}
            >
              <ArrowLeft size={14} />
              {ru ? "Назад" : "Back"}
            </button>
            <button
              className="dw-btn primary"
              onClick={() =>
                index === tourSteps.length - 1 ? onClose() : onMove(index + 1)
              }
              aria-label={
                index === tourSteps.length - 1
                  ? ru
                    ? "Завершить тур"
                    : "Finish tour"
                  : ru
                    ? "Далее"
                    : "Next step"
              }
            >
              {index === tourSteps.length - 1
                ? ru
                  ? "Завершить"
                  : "Finish"
                : ru
                  ? "Далее"
                  : "Next"}
              <ArrowRight size={14} />
            </button>
            <button
              className="dw-tour-icon"
              onClick={onPause}
              aria-label={ru ? "Пауза" : "Pause tour"}
            >
              <Pause size={16} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
