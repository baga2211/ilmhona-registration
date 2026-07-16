import { NextResponse } from "next/server";

export async function POST(request) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

  if (!scriptUrl) {
    console.error("[submit] GOOGLE_SCRIPT_URL не задан в .env.local");
    return NextResponse.json(
      { error: "GOOGLE_SCRIPT_URL не настроен в .env.local" },
      { status: 500 }
    );
  }

  try {
    const data = await request.json();

    const required = [
      "firstName",
      "lastName",
      "phone",
      "email",
      "course",
      "hasComputer",
      "source",
    ];
    for (const key of required) {
      if (!data[key] || String(data[key]).trim() === "") {
        return NextResponse.json({ error: `Поле ${key} обязательно` }, { status: 400 });
      }
    }

    // text/plain — чтобы Apps Script принял POST без проблем с редиректом
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
      redirect: "follow",
    });

    const text = await res.text();

    // Диагностика: смотри вывод в терминале, где запущен npm run dev
    console.log("[submit] Google Script статус:", res.status);
    console.log("[submit] Google Script ответ:", text.slice(0, 300));

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google Script вернул ${res.status}` },
        { status: 502 }
      );
    }

    // Если вместо JSON пришла HTML-страница входа Google — доступ не "Все"
    if (text.trim().startsWith("<")) {
      console.error(
        "[submit] Google вернул HTML вместо JSON — проверь, что доступ к развёртыванию: «Все»"
      );
      return NextResponse.json(
        { error: "Скрипт требует авторизацию. Доступ должен быть «Все»." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[submit] Ошибка:", e);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}