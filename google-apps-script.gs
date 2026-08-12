/**
 * ILMHONA — приём заявок в Google Таблицу (версия 2)
 * ---------------------------------------------------
 * ШАГ 1: Вставь ID своей таблицы в строку ниже.
 *
 * ID — это длинный код из адресной строки таблицы:
 * https://docs.google.com/spreadsheets/d/1j3QuD2T0r7OhRkCIyzI-Iw7u6VFT7UMejyBv_5RQCWk/edit?gid=0#gid=0/edit
 *                                        ^^^^^^^^^^^^^^^^^^^^
 *
 * Как скрипт пишет данные:
 * Каждое поле записывается в колонку, найденную ПО НАЗВАНИЮ заголовка
 * (первая строка листа), а не по порядковому номеру. Поэтому вручную
 * добавленные колонки (например "Статус звонка", "Admin", "Статус
 * клиента", "Комментарии") можно вставлять в любом месте — скрипт их
 * не тронет. Если для какого-то поля своей колонки ещё нет, скрипт
 * сам создаёт её в самом конце листа.
 */
var SPREADSHEET_ID = "1j3QuD2T0r7OhRkCIyzI-Iw7u6VFT7UMejyBv_5RQCWk";
var MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

// Заголовки, которыми управляет скрипт (используются только при создании
// нового листа с нуля — порядок здесь ни на что не влияет при дозаписи).
// Текст должен совпадать один-в-один с реальными заголовками в таблице —
// иначе скрипт не найдёт существующую колонку и создаст дубликат.
var HEADERS = [
  "Дата заявки",
  "Имя",
  "Фамилия",
  "Телефон",
  "Курс",
  "Поток (месяц)",
  "Есть компьютер",
  "Откуда узнал/а",
  "Telegram"
];

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

    // Значения привязаны к названию колонки, а не к позиции —
    // так они всегда попадают в правильное место таблицы.
    var values = {
      "Дата заявки": Utilities.formatDate(now, "GMT+5", "dd.MM.yyyy HH:mm"),
      "Имя": data.firstName || "",
      "Фамилия": data.lastName || "",
      "Телефон": data.phone || "",
      "Курс": data.course || "",
      "Поток (месяц)": monthName,
      "Есть компьютер": data.hasComputer || "",
      "Откуда узнал/а": data.source || "",
      "Telegram": data.telegram || ""
    };

    var ss = getSpreadsheet();

    // 1) Общий лист со всеми заявками
    appendToSheet(ss, "Все заявки", values);

    // 2) Лист конкретного курса и потока (месяца)
    var courseSheetName = sanitize(data.course) + " — " + monthShort;
    appendToSheet(ss, courseSheetName, values);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function appendToSheet(ss, name, values) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS);
    styleHeaderRange(sheet, 1, HEADERS.length);
    sheet.setFrozenRows(1);
    for (var i = 1; i <= HEADERS.length; i++) {
      sheet.setColumnWidth(i, 160);
    }
  }

  var lastCol = sheet.getLastColumn();
  var headerRow = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    : [];

  var nextRow = sheet.getLastRow() + 1;

  for (var header in values) {
    // Ищем колонку с таким заголовком где угодно в листе.
    var col = headerRow.indexOf(header) + 1;

    // Такой колонки ещё нет — создаём новую в самом конце,
    // ручные колонки (Статус звонка, Admin и т.п.) при этом не двигаем.
    if (col === 0) {
      lastCol += 1;
      col = lastCol;
      headerRow.push(header);
      sheet.getRange(1, col).setValue(header);
      styleHeaderRange(sheet, col, 1);
      sheet.setColumnWidth(col, 160);
    }

    var cell = sheet.getRange(nextRow, col);
    if (header === "Телефон") {
      // Без этого Google Sheets определяет содержимое как число и
      // обрезает ведущие нули, например "006220942" -> "6220942".
      cell.setNumberFormat("@");
    }
    cell.setValue(values[header]);
  }
}

function styleHeaderRange(sheet, startCol, numCols) {
  sheet.getRange(1, startCol, 1, numCols)
    .setFontWeight("bold")
    .setBackground("#2F80ED")
    .setFontColor("#FFFFFF");
}

// Название листа не может содержать некоторые символы
function sanitize(name) {
  return String(name || "Без курса")
    .replace(/[\/\\\?\*\[\]:]/g, "-")
    .slice(0, 80);
}

/**
 * ОДНОРАЗОВАЯ ОЧИСТКА лишних колонок "Учёба / работа", "Русский язык"
 * и дубликата "Откуда узнал(а)" (появились из-за старой версии скрипта),
 * плюс перенос "Telegram" сразу после "Есть компьютер".
 *
 * Трогает СТРОГО эти названия колонок. "Статус звонка", "Admin",
 * "Статус клиента", "Комментарии" и любые другие ручные колонки нигде
 * в этом коде не упоминаются и не изменяются.
 *
 * КАК ПОЛЬЗОВАТЬСЯ (сначала шаг 1, потом шаг 2):
 *  1. Выбери в выпадающем списке функцию "previewCleanup" и нажми Run.
 *     Ничего не удалится и не переместится — только отчёт в лог
 *     (иконка часов слева → последний запуск), что БУДЕТ сделано.
 *  2. Прочитал и всё устраивает? Выбери функцию "runCleanup" и нажми
 *     Run — теперь то же самое выполнится по-настоящему.
 */
function previewCleanup() {
  runCleanup_(true);
}

function runCleanup() {
  runCleanup_(false);
}

function runCleanup_(dryRun) {
  var ss = getSpreadsheet();
  var sheets = ss.getSheets();
  var report = [];
  var afterHeader = "Есть компьютер";

  sheets.forEach(function (sheet) {
    var lastCol = sheet.getLastColumn();
    var lastRow = sheet.getLastRow();
    if (lastCol === 0 || lastRow === 0) return;

    var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var log = [];

    // 1) Объединить дубликат "Откуда узнал(а)" в "Откуда узнал/а"
    var dupCol = headerRow.indexOf("Откуда узнал(а)") + 1;
    var correctCol = headerRow.indexOf("Откуда узнал/а") + 1;
    if (dupCol > 0 && correctCol > 0 && lastRow > 1) {
      var dupVals = sheet.getRange(2, dupCol, lastRow - 1, 1).getValues();
      var correctVals = sheet.getRange(2, correctCol, lastRow - 1, 1).getValues();
      var merged = 0;
      for (var r = 0; r < dupVals.length; r++) {
        if (dupVals[r][0] !== "" && correctVals[r][0] === "") {
          correctVals[r][0] = dupVals[r][0];
          merged++;
        }
      }
      if (merged > 0) {
        log.push((dryRun ? "[БУДЕТ] " : "") + 'объединено значений из "Откуда узнал(а)": ' + merged);
        if (!dryRun) sheet.getRange(2, correctCol, lastRow - 1, 1).setValues(correctVals);
      }
    }

    // 2) Определить пустые/дублирующие колонки на удаление
    var toRemove = ["Учёба / работа", "Русский язык", "Откуда узнал(а)"];
    var colsToDelete = [];
    toRemove.forEach(function (header) {
      var idx = headerRow.indexOf(header);
      if (idx === -1) return;
      var col = idx + 1;
      if (header === "Откуда узнал(а)" || lastRow <= 1) {
        colsToDelete.push({ col: col, header: header });
        return;
      }
      var colVals = sheet.getRange(2, col, lastRow - 1, 1).getValues();
      var hasData = colVals.some(function (row) { return row[0] !== ""; });
      if (!hasData) {
        colsToDelete.push({ col: col, header: header });
      } else {
        log.push('ПРОПУЩЕНО (есть данные, не трогаю): "' + header + '"');
      }
    });

    colsToDelete.forEach(function (item) {
      log.push((dryRun ? "[БУДЕТ УДАЛЕНО] " : "удалена колонка: ") + '"' + item.header + '"');
    });
    if (!dryRun) {
      colsToDelete
        .map(function (item) { return item.col; })
        .sort(function (a, b) { return b - a; })
        .forEach(function (col) { sheet.deleteColumn(col); });
    }

    // 3) Переместить "Telegram" сразу после "Есть компьютер"
    var currentHeader = dryRun
      ? headerRow
      : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var telegramCol = currentHeader.indexOf("Telegram") + 1;
    var afterCol = currentHeader.indexOf(afterHeader) + 1;
    if (telegramCol > 0 && afterCol > 0) {
      if (dryRun) {
        log.push('[БУДЕТ] Telegram перемещён сразу после "' + afterHeader + '"');
      } else if (telegramCol !== afterCol + 1) {
        sheet.moveColumns(sheet.getRange(1, telegramCol, sheet.getMaxRows(), 1), afterCol + 1);
        log.push('Telegram перемещён после "' + afterHeader + '"');
      }
    }

    report.push(sheet.getName() + ": " + (log.length ? log.join(" | ") : "без изменений"));
  });

  Logger.log((dryRun ? "=== ПРЕДПРОСМОТР (ничего не изменено) ===\n" : "=== ВЫПОЛНЕНО ===\n") + report.join("\n"));
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
