/**
 * ILMHONA — приём заявок в Google Таблицу (версия 2)
 * ---------------------------------------------------
 * ШАГ 1: Вставь ID своей таблицы в строку ниже.
 *
 * ID — это длинный код из адресной строки таблицы:
 * https://docs.google.com/spreadsheets/d/1j3QuD2T0r7OhRkCIyzI-Iw7u6VFT7UMejyBv_5RQCWk/edit?gid=0#gid=0/edit
 *                                        ^^^^^^^^^^^^^^^^^^^^
 */
var SPREADSHEET_ID = "1j3QuD2T0r7OhRkCIyzI-Iw7u6VFT7UMejyBv_5RQCWk";
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
  "Telegram"
];

// Номер телефона — колонка "Телефон" в HEADERS (1-based индекс)
var PHONE_COL = HEADERS.indexOf("Телефон") + 1;

function getSpreadsheet() {
  // Сначала пробуем по ID, если не задан — пробуем активную таблицу
  if (SPREADSHEET_ID && SPREADSHEET_ID.indexOf("ВСТАВЬ") === -1) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      "Таблица не найдена. Вставь SPREADSHEET_ID в начало скрипта."
    );
  }
  return ss;
}

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
      data.source || "",
      data.telegram || ""
    ];

    var ss = getSpreadsheet();

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
  } else {
    // Лист уже существовал (со старыми заявками) и в HEADERS с тех пор
    // добавились новые колонки (например, "Telegram") — дописываем только
    // недостающие заголовки в конец, старые данные при этом не трогаем.
    var lastCol = sheet.getLastColumn();
    if (lastCol < HEADERS.length) {
      var missing = HEADERS.slice(lastCol);
      sheet.getRange(1, lastCol + 1, 1, missing.length)
        .setValues([missing])
        .setFontWeight("bold")
        .setBackground("#2F80ED")
        .setFontColor("#FFFFFF");
      sheet.setColumnWidth(lastCol + 1, 160);
    }
  }

  // Без этого Google Sheets сам определяет тип ячейки по содержимому и
  // превращает телефон вида "006220942" в число, обрезая ведущие нули.
  var nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, PHONE_COL).setNumberFormat("@");
  sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
}

// Название листа не может содержать некоторые символы
function sanitize(name) {
  return String(name || "Без курса")
    .replace(/[\/\\\?\*\[\]:]/g, "-")
    .slice(0, 80);
}

/**
 * Проверка в браузере: открой /exec URL.
 * Если всё настроено — увидишь "работает" и название таблицы.
 * Если есть проблема — увидишь текст ошибки.
 */
function doGet() {
  try {
    var ss = getSpreadsheet();
    return ContentService.createTextOutput(
      "Ilmhona script работает ✓ Таблица: " + ss.getName()
    );
  } catch (err) {
    return ContentService.createTextOutput("Ошибка: " + String(err));
  }
}
