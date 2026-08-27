"use client";

import { useState } from "react";

const COURSES = [
  "Основы AI",
  "Python lvl 1",
  "Python lvl 2",
  "Frontend с 0",
  "JS lvl 1",
  "JS lvl 2",
  "Graphic Design lvl 0",
  "Graphic Design",
  "Graphic Design LVL 1",
  "Графический дизайн с ИИ",
  "Мобилография с нуля",
  "Excel для начинающих",
  "Devops",
  "UX/UI",
  "Digital Marketing",
  "IT Project Management",
  "Основы компьютерный грамотности",
  "Основы программирования Scratch",
  "C# lvl 0",
  "Golang lvl 0",
  "Мобилография c нуля",
  "Кинемотография",
  "Excel",
  "Базы Данных",
  "Product Design",
  "Кинопроизводство",
  "Цифровая иллюстрация ",
  "Введение в кибербезопасность",
  "Blender Advanced: профессиональная 3D-графика",
  "Vibe Coding",
  "SMM Express",
  "Python Базовый Уровень",
  
  
];

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

// Все 12 месяцев, январь → декабрь. В подписи года нет.
// Но в value год всё равно есть ("09.2026") — он нужен таблице, чтобы
// сентябрь 2026 и сентябрь 2027 попали в разные листы. Год выбирается сам:
// если месяц уже прошёл в этом году — берётся следующий год.
function buildStreamOptions() {
  const now = new Date();
  const curMonth = now.getMonth(); // 0..11
  const curYear = now.getFullYear();
  return MONTHS_RU.map((name, i) => {
    const year = i < curMonth ? curYear + 1 : curYear;
    return {
      value: `${String(i + 1).padStart(2, "0")}.${year}`,
      label: name,
    };
  });
}

const STREAM_OPTIONS = buildStreamOptions();

const PHONE_CODES = [
  { code: "+992", flag: "🇹🇯" },
  { code: "+996", flag: "🇰🇬" },
  { code: "+7", flag: "🇷🇺" },
  { code: "+998", flag: "🇺🇿" },
];

const SOURCES = [
  "Instagram",
  "Telegram",
  "Facebook",
  "От друзей / знакомых",
  "Реклама",
  "Другое",
];

const initial = {
  firstName: "",
  lastName: "",
  phoneCode: "",
  phone: "",
  telegram: "",
  course: "",
  streamMonth: "",
  hasComputer: "",
  source: "",
};

export default function Home() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [failMsg, setFailMsg] = useState("");

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setErrors({ ...errors, [key]: false });
  };

  const validate = () => {
    const err = {};
    if (!form.firstName.trim()) err.firstName = true;
    if (!form.lastName.trim()) err.lastName = true;
    if (!/^[\d\s-]{6,15}$/.test(form.phone.trim())) err.phone = true;
    if (!form.telegram.trim()) err.telegram = true;
    if (!form.course) err.course = true;
    if (!form.streamMonth) err.streamMonth = true;
    if (!form.hasComputer) err.hasComputer = true;
    if (!form.source) err.source = true;
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const submit = async () => {
    setFailMsg("");
    if (!validate()) return;
    setSending(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: `${form.phoneCode} ${form.phone.trim()}`,
        }),
      });
      if (!res.ok) throw new Error("bad status");
      setDone(true);
    } catch {
      setFailMsg("Не удалось отправить. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  };

  const selectCls = (key) =>
    `select ${form[key] ? "filled" : ""} ${errors[key] ? "error" : ""}`;

  return (
    <main className="card">
      {done ? (
        <div className="thanks">
          <div className="thanks-icon">✓</div>
          <h2>Заявка отправлена!</h2>
          <p>
            Спасибо за регистрацию на курс «{form.course}»
            {form.streamMonth &&
              ` (поток ${
                STREAM_OPTIONS.find((m) => m.value === form.streamMonth)?.label ||
                form.streamMonth
              })`}
            .
            <br />
            Мы свяжемся с вами в ближайшее время.
          </p>
        </div>
      ) : (
        <>
          <h1 className="logo">Ilmhona</h1>
          <p className="subtitle">Регистрация на курсы</p>

          <div className="field">
            <input
              className={`input ${errors.firstName ? "error" : ""}`}
              placeholder="Ваше имя"
              value={form.firstName}
              onChange={set("firstName")}
            />
          </div>

          <div className="field">
            <input
              className={`input ${errors.lastName ? "error" : ""}`}
              placeholder="Ваша фамилия"
              value={form.lastName}
              onChange={set("lastName")}
            />
          </div>

          <div className="field">
            <div className={`phone-row ${errors.phone ? "error" : ""}`}>
              <select
                className="phone-code"
                value={form.phoneCode}
                onChange={set("phoneCode")}
                aria-label="Код страны"
              >
                {PHONE_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                className="phone-input"
                placeholder="900 12 34 56"
                inputMode="tel"
                value={form.phone}
                onChange={set("phone")}
              />
            </div>
          </div>

          <div className="field">
            <input
              className={`input ${errors.telegram ? "error" : ""}`}
              placeholder="Ваш Telegram (например @username)"
              value={form.telegram}
              onChange={set("telegram")}
            />
          </div>

          <div className="field">
            <select className={selectCls("course")} value={form.course} onChange={set("course")}>
              <option value="" disabled>
                Выберите продукт
              </option>
              {COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <select
              className={selectCls("streamMonth")}
              value={form.streamMonth}
              onChange={set("streamMonth")}
            >
              <option value="" disabled>
                -- На какой месяц (поток) записываетесь?
              </option>
              {STREAM_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <select
              className={selectCls("hasComputer")}
              value={form.hasComputer}
              onChange={set("hasComputer")}
            >
              <option value="" disabled>
                -- Имеете ли вы компьютер для обучения?
              </option>
              <option value="Да">Да</option>
              <option value="Нет">Нет</option>
            </select>
          </div>


          <div className="field">
            <select className={selectCls("source")} value={form.source} onChange={set("source")}>
              <option value="" disabled>
                -- Как вы узнали о нашем курсе?
              </option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button className="submit-btn" onClick={submit} disabled={sending}>
            {sending ? "Отправка..." : "Отправить"}
          </button>

          {failMsg && <div className="msg fail">{failMsg}</div>}

          <p className="contact-note">
            Вы можете связаться с нами по
            <br />
            следующим ссылкам
          </p>

          <div className="socials">
            
            <a className="social" href="@ilmhonaonline" target="_blank" rel="noreferrer">
              <span className="social-icon telegram">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.04 15.31l-.38 5.32c.54 0 .78-.23 1.06-.51l2.55-2.44 5.28 3.87c.97.53 1.66.25 1.92-.9L22.9 4.4c.31-1.43-.52-1.99-1.46-1.64L3.1 9.87c-1.4.54-1.38 1.32-.24 1.67l4.69 1.46 10.88-6.87c.51-.31.98-.14.6.2L9.04 15.31z" />
                </svg>
              </span>
              Telegram
            </a>
            <a className="social" href="https://ilmhona.org/" target="_blank" rel="noreferrer">
              <span className="social-icon site">WWW</span>
              Сайт
            </a>
          </div>

        
        </>
      )}
    </main>
  );
}
