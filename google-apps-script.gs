/**
 * ILMHONA — приём заявок в Google Таблицу
 * ---------------------------------------
 * Как это работает:
 *  1. Каждая заявка попадает в общий лист "Все заявки".
 *  2. Дополнительно создаётся/дополняется отдельный лист для каждого
 *     курса и месяца (потока), например: "Python lvl 1 — 07.2026".
 *     Так все студенты Python за июль лежат отдельно от августовских.
 *
 * Установка:
 *  1. Создайте Google Таблицу (sheets.google.com).
 *  2. Расширения → Apps Script → вставьте этот код целиком.
 *  3. Нажмите "Развернуть" → "Новое развёртывание" → тип "Веб-приложение".
 *     - "Выполнять от имени": Я (ваш аккаунт)
 *     - "У кого есть доступ": Все
 *  4. Скопируйте URL веб-приложения и вставьте его в .env.local
 *     проекта Next.js как GOOGLE_SCRIPT_URL.
 */

var MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

var HEADERS = [
  "Дата заявки",
  "Имя",
  "Фамилия",
  "Телефон",
  "Email",
  "Курс",
  "Поток (месяц)",
  "Есть компьютер",
  "Учёба / работа",
  "Русский язык",
  "Откуда узнал(а)",
  // Дальше — колонки для ручного заполнения менеджером, скрипт их не трогает
  "Кто позвонил",
  "Придёт? (да/нет)",
  "Комментарий"
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var now = new Date();
    var monthName = MONTHS_RU[now.getMonth()] + " " + now.getFullYear();
    var monthShort =
      ("0" + (now.getMonth() + 1)).slice(-2) + "." + now.getFullYear();

    var row = [
      Utilities.formatDate(now, "GMT+5", "dd.MM.yyyy HH:mm"),
      data.firstName || "",
      data.lastName || "",
      data.phone || "",
      data.email || "",
      data.course || "",
      monthName,
      data.hasComputer || "",
      data.studyWork || "",
      data.russian || "",
      data.source || ""
    ];

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1) Общий лист со всеми заявками
    appendToSheet(ss, "Все заявки", row);

    // 2) Лист конкретного курса и потока (месяца)
    var courseSheetName = sanitize(data.course) + " — " + monthShort;
    appendToSheet(ss, courseSheetName, row);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function appendToSheet(ss, name, row) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#2F80ED")
      .setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
    for (var i = 1; i <= HEADERS.length; i++) {
      sheet.setColumnWidth(i, 160);
    }
  }
  sheet.appendRow(row);
}

// Название листа в Google Sheets не может содержать некоторые символы
function sanitize(name) {
  return String(name || "Без курса")
    .replace(/[\/\\\?\*\[\]:]/g, "-")
    .slice(0, 80);
}

// Проверка, что скрипт жив (открыть URL в браузере)
function doGet() {
  return ContentService.createTextOutput("Ilmhona script работает ✓");
}
