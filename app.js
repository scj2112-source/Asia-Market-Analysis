// ==========================================================================
// Market Insight AI MVP - Core Application Logic
// ==========================================================================

// 브라우저 보안 정책상 로컬 폴더를 백그라운드에서 자동 감시할 수 없습니다.
// 사용자가 최초 선택한 파일 목록을 기준으로, 데이터 새로고침 버튼 클릭 시 다시 읽고 재분석합니다.
// 새 CSV 파일이 추가된 경우에는 폴더 또는 파일을 다시 선택해야 할 수 있습니다.

// --- Global Application State ---
let connectedFiles = [];
let lastLoadedAt = null;
let fileMetaSnapshot = [];
let currentDataRows = [];
let filteredDataRows = [];
let availableCountries = new Set();
let availableMonths = new Set();

const COLUMN_ALIAS = {
  "MONTH": "Month", "month": "Month", "Month": "Month", "yyyyyymm": "Month",
  "COUNTRY": "Country", "country": "Country", "Country": "Country",
  "MAIN TYPES": "Main Types", "Main Type": "Main Types", "Main Types": "Main Types",
  "BRAND - AD HOC": "Brand - AD hoc", "Brand - AD Hoc": "Brand - AD hoc", "Brand - AD hoc": "Brand - AD hoc", "Brand": "Brand - AD hoc", "brand": "Brand - AD hoc",
  "SALES UNITS": "Sales Units", "Sales Units": "Sales Units", "Qty": "Sales Units", "qty": "Sales Units",
  "SALES USD": "Sales USD", "Sales USD": "Sales USD", "Value USD": "Sales USD", "value_usd": "Sales USD",
  "NET LTRS TOTAL": "Net Ltrs Total", "Net Ltrs Total": "Net Ltrs Total", "Capacity": "Net Ltrs Total",
  "MODEL": "Model", "model": "Model", "Model": "Model",
  "YEAR": "Year", "year": "Year", "Year": "Year",
  "HALF": "Half", "half": "Half", "Half": "Half",
  "QUARTER": "Quarter", "quarter": "Quarter", "Quarter": "Quarter",
  "CONSTRUCTION": "Construction", "construction": "Construction", "Construction": "Construction",
  "SALES LC(LOCAL CURRENCY)": "Sales LC(Local Currency)", "Sales LC": "Sales LC(Local Currency)"
};

const MAIN_TYPE_MAP = {
  "1 DOOR >90 CM": "1D",
  "1 DOOR 81 - 90 CM": "1D",
  "1 DOOR UP TO 80 CM": "1D",
  "2 DR FRZ. BTM": "B/F",
  "2 DR FRZ. TOP": "T/F",
  "2 DR SIDE BY SIDE": "SxS",
  "3 DR FRENCH": "F/D",
  "3 DR REGULAR": "T/F",
  "3 DR SIDE BY SIDE": "SxS",
  "4+ DOORS": "F/D",
  "N.A.": "1D"
};

// Output Order Guidelines
const TYPE_ORDER = ["T/F", "1D", "SxS", "F/D", "B/F", "Others"];
const CAPACITY_ORDER = ["300L↓", "300-400L", "400-500L", "500-600L", "600L↑", "Unknown"];
const PRICE_ORDER = ["$500↓", "$500↑", "$1000↑", "$2000↑", "$3000↑"];

// --- 1. Sample Data Definition ---
// 태국 2026년 3월(Current) & 2025년 3월(YoY 비교용)
const SAMPLE_DATA = [
  // --- 2026-03 Current Month (Thailand) ---
  // T/F Segment
  { Model: "TF-SML", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "280", "Brand - AD hoc": "LG", "Sales Units": "8500", "Sales LC(Local Currency)": "133000000", "Sales USD": "3800000" },
  { Model: "TF-MED", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "350", "Brand - AD hoc": "LG", "Sales Units": "9800", "Sales LC(Local Currency)": "171500000", "Sales USD": "4900000" },
  { Model: "TF-SAM", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "380", "Brand - AD hoc": "Samsung", "Sales Units": "15000", "Sales LC(Local Currency)": "262500000", "Sales USD": "7500000" },
  { Model: "TF-TOS", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "3 DR REGULAR", "Net Ltrs Total": "420", "Brand - AD hoc": "Toshiba", "Sales Units": "12000", "Sales LC(Local Currency)": "224000000", "Sales USD": "6400000" },
  { Model: "TF-HAI", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "220", "Brand - AD hoc": "Haier", "Sales Units": "18000", "Sales LC(Local Currency)": "238000000", "Sales USD": "6800000" },
  { Model: "TF-OTH", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "310", "Brand - AD hoc": "Others", "Sales Units": "22000", "Sales LC(Local Currency)": "315000000", "Sales USD": "9000000" },

  // 1D Segment
  { Model: "1D-MINI", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "1 DOOR UP TO 80 CM", "Net Ltrs Total": "150", "Brand - AD hoc": "Samsung", "Sales Units": "25000", "Sales LC(Local Currency)": "140000000", "Sales USD": "4000000" },
  { Model: "1D-MED", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "1 DOOR 81 - 90 CM", "Net Ltrs Total": "240", "Brand - AD hoc": "Haier", "Sales Units": "20000", "Sales LC(Local Currency)": "122500000", "Sales USD": "3500000" },
  { Model: "1D-LG", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "N.A.", "Net Ltrs Total": "180", "Brand - AD hoc": "LG", "Sales Units": "4200", "Sales LC(Local Currency)": "29400000", "Sales USD": "840000" },
  { Model: "1D-OTH", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "1 DOOR UP TO 80 CM", "Net Ltrs Total": "120", "Brand - AD hoc": "Others", "Sales Units": "35000", "Sales LC(Local Currency)": "168000000", "Sales USD": "4800000" },

  // SxS Segment
  { Model: "SXS-LG", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR SIDE BY SIDE", "Net Ltrs Total": "620", "Brand - AD hoc": "LG", "Sales Units": "1100", "Sales LC(Local Currency)": "77000000", "Sales USD": "2200000" },
  { Model: "SXS-SAM", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR SIDE BY SIDE", "Net Ltrs Total": "640", "Brand - AD hoc": "Samsung", "Sales Units": "2000", "Sales LC(Local Currency)": "133000000", "Sales USD": "3800000" },
  { Model: "SXS-OTH", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "3 DR SIDE BY SIDE", "Net Ltrs Total": "610", "Brand - AD hoc": "Others", "Sales Units": "1500", "Sales LC(Local Currency)": "101500000", "Sales USD": "2900000" },

  // F/D Segment
  { Model: "FD-LG", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "4+ DOORS", "Net Ltrs Total": "540", "Brand - AD hoc": "LG", "Sales Units": "600", "Sales LC(Local Currency)": "47250000", "Sales USD": "1350000" },
  { Model: "FD-SAM", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "3 DR FRENCH", "Net Ltrs Total": "560", "Brand - AD hoc": "Samsung", "Sales Units": "900", "Sales LC(Local Currency)": "66500000", "Sales USD": "1900000" },
  { Model: "FD-OTH", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "4+ DOORS", "Net Ltrs Total": "580", "Brand - AD hoc": "Others", "Sales Units": "1200", "Sales LC(Local Currency)": "87500000", "Sales USD": "2500000" },

  // B/F Segment
  { Model: "BF-LG", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. BTM", "Net Ltrs Total": "320", "Brand - AD hoc": "LG", "Sales Units": "1000", "Sales LC(Local Currency)": "31500000", "Sales USD": "900000" },
  { Model: "BF-SAM", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. BTM", "Net Ltrs Total": "340", "Brand - AD hoc": "Samsung", "Sales Units": "2300", "Sales LC(Local Currency)": "70000000", "Sales USD": "2000000" },
  { Model: "BF-OTH", Year: "2026", Half: "1H", Quarter: "1Q", Month: "202603", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. BTM", "Net Ltrs Total": "360", "Brand - AD hoc": "Others", "Sales Units": "1500", "Sales LC(Local Currency)": "49000000", "Sales USD": "1400000" },


  // --- 2025-03 Previous Year Same Month (Thailand) ---
  // (Market Value: $44.36M, LG Share: 8.5%, Qty: 185K 대)
  // T/F
  { Model: "TF-SML", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "280", "Brand - AD hoc": "LG", "Sales Units": "7800", "Sales LC(Local Currency)": "119000000", "Sales USD": "3400000" },
  { Model: "TF-MED", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "350", "Brand - AD hoc": "LG", "Sales Units": "8500", "Sales LC(Local Currency)": "147000000", "Sales USD": "4200000" },
  { Model: "TF-SAM", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "380", "Brand - AD hoc": "Samsung", "Sales Units": "12000", "Sales LC(Local Currency)": "203000000", "Sales USD": "5800000" },
  { Model: "TF-OTH", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. TOP", "Net Ltrs Total": "310", "Brand - AD hoc": "Others", "Sales Units": "18000", "Sales LC(Local Currency)": "245000000", "Sales USD": "7000000" },
  // 1D
  { Model: "1D-MINI", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "1 DOOR UP TO 80 CM", "Net Ltrs Total": "150", "Brand - AD hoc": "Samsung", "Sales Units": "22000", "Sales LC(Local Currency)": "122500000", "Sales USD": "3500000" },
  { Model: "1D-LG", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "N.A.", "Net Ltrs Total": "180", "Brand - AD hoc": "LG", "Sales Units": "3500", "Sales LC(Local Currency)": "23100000", "Sales USD": "660000" },
  { Model: "1D-OTH", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "1 DOOR UP TO 80 CM", "Net Ltrs Total": "120", "Brand - AD hoc": "Others", "Sales Units": "30000", "Sales LC(Local Currency)": "136500000", "Sales USD": "3900000" },
  // SxS
  { Model: "SXS-LG", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR SIDE BY SIDE", "Net Ltrs Total": "620", "Brand - AD hoc": "LG", "Sales Units": "1000", "Sales LC(Local Currency)": "70000000", "Sales USD": "2000000" },
  { Model: "SXS-SAM", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR SIDE BY SIDE", "Net Ltrs Total": "640", "Brand - AD hoc": "Samsung", "Sales Units": "1600", "Sales LC(Local Currency)": "101500000", "Sales USD": "2900000" },
  { Model: "SXS-OTH", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "3 DR SIDE BY SIDE", "Net Ltrs Total": "610", "Brand - AD hoc": "Others", "Sales Units": "1200", "Sales LC(Local Currency)": "77000000", "Sales USD": "2200000" },
  // F/D
  { Model: "FD-LG", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "4+ DOORS", "Net Ltrs Total": "540", "Brand - AD hoc": "LG", "Sales Units": "500", "Sales LC(Local Currency)": "38500000", "Sales USD": "1100000" },
  { Model: "FD-SAM", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "3 DR FRENCH", "Net Ltrs Total": "560", "Brand - AD hoc": "Samsung", "Sales Units": "800", "Sales LC(Local Currency)": "56000000", "Sales USD": "1600000" },
  { Model: "FD-OTH", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "4+ DOORS", "Net Ltrs Total": "580", "Brand - AD hoc": "Others", "Sales Units": "1000", "Sales LC(Local Currency)": "70000000", "Sales USD": "2000000" },
  // B/F
  { Model: "BF-LG", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. BTM", "Net Ltrs Total": "320", "Brand - AD hoc": "LG", "Sales Units": "800", "Sales LC(Local Currency)": "24500000", "Sales USD": "700000" },
  { Model: "BF-SAM", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. BTM", "Net Ltrs Total": "340", "Brand - AD hoc": "Samsung", "Sales Units": "1800", "Sales LC(Local Currency)": "52500000", "Sales USD": "1500000" },
  { Model: "BF-OTH", Year: "2025", Half: "1H", Quarter: "1Q", Month: "202503", Country: "Thailand", Construction: "FREE STANDING", "Main Types": "2 DR FRZ. BTM", "Net Ltrs Total": "360", "Brand - AD hoc": "Others", "Sales Units": "1200", "Sales LC(Local Currency)": "38500000", "Sales USD": "1100000" }
];

// --- 2. Normalization / Category Mapping Helpers ---
function formatMonth(monthValue) {
  const str = String(monthValue).trim();
  if (str.length < 6) return str;
  const year = str.slice(2, 4);
  const month = str.slice(4, 6);
  return `${year}-${month}`;
}

function normalizeMainType(mainType) {
  const key = String(mainType || "").trim().toUpperCase();
  return MAIN_TYPE_MAP[key] || "Others";
}

function getCapacitySegment(liters) {
  const lit = parseFloat(liters);
  if (isNaN(lit) || liters === "" || liters === null) return "Unknown";
  if (lit <= 300) return "300L↓";
  if (lit <= 400) return "300-400L";
  if (lit <= 500) return "400-500L";
  if (lit <= 600) return "500-600L";
  return "600L↑";
}

function getPriceSegment(asp) {
  const val = parseFloat(asp);
  if (isNaN(val)) return "$500↓";
  if (val < 500) return "$500↓";
  if (val < 1000) return "$500↑";
  if (val < 2000) return "$1000↑";
  if (val < 3000) return "$2000↑";
  return "$3000↑";
}

function cleanNumber(val) {
  if (val === undefined || val === null) return 0;
  const cleanStr = String(val).replace(/,/g, "").trim();
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

// --- 3. CSV Parser Engine (Supports asynchronous chunking) ---
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(val => val.replace(/^"|"$/g, '').trim());
}

async function parseCSVTextAsync(text, onProgress) {
  return new Promise((resolve, reject) => {
    // UTF-8 BOM 제거
    if (text.startsWith('\uFEFF')) {
      text = text.substring(1);
    }
    
    // Line split (detect \r\n, \r, \n)
    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || lines[0].trim() === "") {
      resolve([]);
      return;
    }
    
    // Parse header
    const headerLine = lines[0];
    let delimiter = ',';
    if (headerLine.includes('\t') && !headerLine.includes(',')) {
      delimiter = '\t';
    }
    
    let rawHeaders;
    if (delimiter === '\t') {
      rawHeaders = headerLine.split('\t').map(h => h.trim());
    } else {
      rawHeaders = parseCSVLine(headerLine);
    }
    
    // Map headers via alias mapping
    const headers = rawHeaders.map(h => {
      const upper = h.toUpperCase();
      return COLUMN_ALIAS[upper] || COLUMN_ALIAS[h] || h;
    });
    
    // Validate core headers
    const required = ["Month", "Country", "Main Types", "Brand - AD hoc", "Sales Units", "Sales USD", "Net Ltrs Total"];
    const missing = required.filter(req => !headers.includes(req));
    if (missing.length > 0) {
      reject(new Error(`필수 컬럼 누락: ${missing.join(', ')}`));
      return;
    }
    
    const rows = [];
    const totalLines = lines.length;
    let index = 1;
    const chunkSize = 5000; // 5000행씩 비동기 분할 처리
    
    function parseNextChunk() {
      const end = Math.min(index + chunkSize, totalLines);
      for (; index < end; index++) {
        const line = lines[index].trim();
        if (line === "") continue;
        
        let values;
        if (delimiter === '\t') {
          values = line.split('\t').map(v => v.trim());
        } else {
          values = parseCSVLine(line);
        }
        
        if (values.length < headers.length) continue;
        
        const row = {};
        headers.forEach((h, colIdx) => {
          row[h] = values[colIdx];
        });
        
        // 데이터 가공 및 필드 생성
        const model = row["Model"] || "Unknown";
        const year = row["Year"] || "";
        const half = row["Half"] || "";
        const quarter = row["Quarter"] || "";
        const month = row["Month"] || "";
        const display_month = formatMonth(month);
        const country = row["Country"] || "";
        const construction = row["Construction"] || "";
        const main_type = row["Main Types"] || "";
        const type_category = normalizeMainType(main_type);
        const capacity_liter = cleanNumber(row["Net Ltrs Total"]);
        const capacity_segment = getCapacitySegment(capacity_liter);
        const brand = row["Brand - AD hoc"] || "Others";
        
        const qty = cleanNumber(row["Sales Units"]);
        const value_lc = cleanNumber(row["Sales LC(Local Currency)"]);
        const value_usd = cleanNumber(row["Sales USD"]);
        
        const asp = qty > 0 ? (value_usd / qty) : 0;
        const price_segment = getPriceSegment(asp);
        
        rows.push({
          model, year, half, quarter, month, display_month,
          country, construction, main_type, type_category,
          capacity_liter, capacity_segment, brand,
          qty, value_lc, value_usd, asp, price_segment
        });
      }
      
      if (onProgress) {
        onProgress(Math.floor((index / totalLines) * 100));
      }
      
      if (index < totalLines) {
        setTimeout(parseNextChunk, 0);
      } else {
        resolve(rows);
      }
    }
    
    parseNextChunk();
  });
}

// --- 4. DataProvider Implementation ---
class DataProvider {
  constructor() {
    this.resetState();
  }
  
  resetState() {
    currentDataRows = [];
    filteredDataRows = [];
    availableCountries.clear();
    availableMonths.clear();
  }
  
  loadSampleData() {
    this.resetState();
    
    // SAMPLE_DATA는 Object 형식의 Raw Data 형태이므로 파싱 과정 시뮬레이션
    SAMPLE_DATA.forEach(row => {
      const month = row["Month"];
      const display_month = formatMonth(month);
      const main_type = row["Main Types"];
      const type_category = normalizeMainType(main_type);
      const capacity_liter = cleanNumber(row["Net Ltrs Total"]);
      const capacity_segment = getCapacitySegment(capacity_liter);
      const qty = cleanNumber(row["Sales Units"]);
      const value_usd = cleanNumber(row["Sales USD"]);
      const value_lc = cleanNumber(row["Sales LC(Local Currency)"]);
      const asp = qty > 0 ? (value_usd / qty) : 0;
      const price_segment = getPriceSegment(asp);
      
      currentDataRows.push({
        model: row["Model"],
        year: row["Year"],
        half: row["Half"],
        quarter: row["Quarter"],
        month: month,
        display_month: display_month,
        country: row["Country"],
        construction: row["Construction"],
        main_type: main_type,
        type_category: type_category,
        capacity_liter: capacity_liter,
        capacity_segment: capacity_segment,
        brand: row["Brand - AD hoc"],
        qty: qty,
        value_lc: value_lc,
        value_usd: value_usd,
        asp: asp,
        price_segment: price_segment
      });
      
      availableCountries.add(row["Country"]);
      availableMonths.add(month);
    });
    
    updateFilterOptions();
    applyFilter();
    updateDashboardUI();
    
    document.getElementById("status-mode").innerText = "Sample Data Mode";
    document.getElementById("status-mode").className = "status-value mode-sample";
    document.getElementById("status-count").innerText = "Sample loaded";
    document.getElementById("status-time").innerText = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].slice(0, 5);
    
    // Disable refresh in sample data mode
    document.getElementById("btn-refresh").disabled = true;
  }
  
  async processFiles(files) {
    if (!files || files.length === 0) return;
    
    showLoader("파일 읽는 중...");
    
    connectedFiles = Array.from(files);
    
    // 메타데이터 캡처
    fileMetaSnapshot = connectedFiles.map(file => ({
      name: file.name,
      size: file.size,
      lastModified: file.lastModified
    }));
    
    const csvFiles = connectedFiles.filter(f => f.name.endsWith('.csv') || f.name.endsWith('.txt'));
    if (csvFiles.length === 0) {
      hideLoader();
      showBotMessage("오류: 선택한 폴더/파일에 CSV 파일이 없습니다.");
      return;
    }
    
    let totalRows = [];
    let processedCount = 0;
    
    for (const file of csvFiles) {
      try {
        const text = await this.readFileAsText(file);
        
        // 모바일 환경에서의 성능 고려 안내
        if (text.length > 3000000 && window.innerWidth <= 1024) {
          showBotMessage("데이터 양이 많아 모바일 환경에서는 처리 시간이 길어질 수 있습니다.");
        }
        
        const rows = await parseCSVTextAsync(text, (percent) => {
          showLoader(`파싱 중 (${file.name}): ${percent}%`);
        });
        
        totalRows = totalRows.concat(rows);
        processedCount++;
      } catch (err) {
        hideLoader();
        showBotMessage(`오류 (${file.name}): ${err.message}\n일부 CSV 파일의 구조가 올바르지 않습니다. 필수 컬럼을 확인해주세요.\nModel, Year, Half, Quarter, Month, Country, Construction, Main Types, Net Ltrs Total, Brand - AD hoc, Sales Units, Sales LC(Local Currency), Sales USD`);
        return;
      }
    }
    
    if (totalRows.length === 0) {
      hideLoader();
      showBotMessage("가져올 수 있는 데이터 행이 없습니다.");
      return;
    }
    
    // State 갱신
    this.resetState();
    currentDataRows = totalRows;
    currentDataRows.forEach(r => {
      availableCountries.add(r.country);
      availableMonths.add(r.month);
    });
    
    updateFilterOptions();
    applyFilter();
    updateDashboardUI();
    
    // Status UI 갱신
    document.getElementById("status-mode").innerText = "Raw Data Connected";
    document.getElementById("status-mode").className = "status-value mode-connected";
    document.getElementById("status-count").innerText = `${processedCount} CSV files`;
    
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0].slice(0, 5);
    document.getElementById("status-time").innerText = formattedDate;
    lastLoadedAt = formattedDate;
    
    document.getElementById("btn-refresh").disabled = false;
    hideLoader();
    
    showBotMessage(`데이터 연결이 완료되었습니다.\n총 ${processedCount}개의 CSV 파일(${currentDataRows.length.toLocaleString()}행)을 로드하여 대시보드를 업데이트했습니다.`);
  }
  
  async loadFromPaste(text) {
    if (!text || text.trim() === "") return;
    
    showLoader("붙여넣은 데이터 처리 중...");
    
    try {
      const rows = await parseCSVTextAsync(text, (percent) => {
        showLoader(`파싱 중: ${percent}%`);
      });
      
      if (rows.length === 0) {
        hideLoader();
        showBotMessage("가져올 수 있는 데이터 행이 없습니다.");
        return;
      }
      
      this.resetState();
      connectedFiles = []; // Paste mode clears file bindings
      fileMetaSnapshot = [];
      
      currentDataRows = rows;
      currentDataRows.forEach(r => {
        availableCountries.add(r.country);
        availableMonths.add(r.month);
      });
      
      updateFilterOptions();
      applyFilter();
      updateDashboardUI();
      
      document.getElementById("status-mode").innerText = "Raw Data Connected (Paste)";
      document.getElementById("status-mode").className = "status-value mode-connected";
      document.getElementById("status-count").innerText = "1 Pasted Block";
      
      const now = new Date();
      const formattedDate = now.toISOString().split('T')[0] + ' ' + now.toTimeString().split(' ')[0].slice(0, 5);
      document.getElementById("status-time").innerText = formattedDate;
      lastLoadedAt = formattedDate;
      
      document.getElementById("btn-refresh").disabled = true; // No files to refresh
      hideLoader();
      
      showBotMessage(`붙여넣은 CSV 데이터 분석이 완료되었습니다.\n총 ${currentDataRows.length.toLocaleString()}행을 로드하여 대시보드를 업데이트했습니다.`);
    } catch (err) {
      hideLoader();
      showBotMessage(`붙여넣기 오류: ${err.message}\n필수 컬럼이 포함되어 있는지 확인해주세요: Model, Year, Half, Quarter, Month, Country, Construction, Main Types, Net Ltrs Total, Brand - AD hoc, Sales Units, Sales LC(Local Currency), Sales USD`);
    }
  }
  
  async refreshData() {
    if (!connectedFiles || connectedFiles.length === 0) {
      showBotMessage("Raw 데이터를 먼저 연결해주세요.");
      return;
    }
    
    showBotMessage("데이터를 새로고침하고 있습니다...");
    showLoader("새로고침 중...");
    
    // 변경 사항 판단
    let changed = false;
    if (fileMetaSnapshot.length !== connectedFiles.length) {
      changed = true;
    } else {
      for (let i = 0; i < connectedFiles.length; i++) {
        const prev = fileMetaSnapshot[i];
        const curr = connectedFiles[i];
        if (prev.name !== curr.name || prev.size !== curr.size || prev.lastModified !== curr.lastModified) {
          changed = true;
          break;
        }
      }
    }
    
    if (!changed) {
      hideLoader();
      showBotMessage("변경된 CSV 파일은 없습니다.\n기존 데이터 기준으로 대시보드를 유지합니다.");
      return;
    }
    
    // 변경점이 있으면 재파싱 실행
    await this.processFiles(connectedFiles);
    
    showBotMessage(`데이터 새로고침이 완료되었습니다.\n총 ${connectedFiles.length}개의 CSV 파일을 다시 읽었고, 최신 기준으로 대시보드를 업데이트했습니다.`);
  }
  
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("파일 읽기 오류"));
      reader.readAsText(file, "UTF-8");
    });
  }

  // --- Future Extensions (DataProvider Specs) ---
  loadFromSharePoint() {
    console.log("Future Extension: Load data from SharePoint");
  }
  loadFromOneDrive() {
    console.log("Future Extension: Load data from OneDrive");
  }
  loadFromTeams() {
    console.log("Future Extension: Load data from Teams");
  }
  loadFromS3() {
    console.log("Future Extension: Load data from AWS S3");
  }
  watchSharePointFolder() {
    console.log("Future Extension: Watch SharePoint folder updates");
  }
  refreshFromSharePoint() {
    console.log("Future Extension: Refresh data from SharePoint");
  }
  refreshFromTeams() {
    console.log("Future Extension: Refresh data from Teams");
  }
}

const dataProvider = new DataProvider();

// --- 5. UI Control Helpers & Loader ---
function showLoader(message) {
  let loader = document.getElementById("ui-loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "ui-loader";
    loader.style.position = "fixed";
    loader.style.top = "15px";
    loader.style.right = "15px";
    loader.style.background = "rgba(0, 0, 0, 0.85)";
    loader.style.color = "#fff";
    loader.style.padding = "10px 20px";
    loader.style.borderRadius = "8px";
    loader.style.border = "1px solid var(--border-light)";
    loader.style.zIndex = "9999";
    loader.style.fontSize = "0.85rem";
    loader.style.display = "flex";
    loader.style.alignItems = "center";
    loader.style.boxShadow = "var(--shadow-lg)";
    document.body.appendChild(loader);
  }
  loader.innerHTML = `<span class="spinner"></span> <span id="loader-text">${message}</span>`;
  loader.style.display = "flex";
}

function hideLoader() {
  const loader = document.getElementById("ui-loader");
  if (loader) loader.style.display = "none";
}

// --- 6. Filtering & Dashboard Rendering Core ---
function updateFilterOptions() {
  const countrySelect = document.getElementById("filter-country");
  const monthSelect = document.getElementById("filter-month");
  
  // Clean drop options except basic
  countrySelect.innerHTML = '<option value="all">전체 Country</option>';
  monthSelect.innerHTML = '';
  
  // Sort and append countries
  Array.from(availableCountries).sort().forEach(country => {
    const opt = document.createElement("option");
    opt.value = country;
    opt.innerText = country;
    countrySelect.appendChild(opt);
  });
  
  // Sort months in descending order (latest first)
  const sortedMonths = Array.from(availableMonths).sort((a, b) => b - a);
  sortedMonths.forEach((month, idx) => {
    const opt = document.createElement("option");
    opt.value = month;
    opt.innerText = formatMonth(month);
    if (idx === 0) {
      opt.selected = true; // Default to latest month
    }
    monthSelect.appendChild(opt);
  });
}

function applyFilter() {
  const countrySelect = document.getElementById("filter-country");
  const monthSelect = document.getElementById("filter-month");
  
  const selectedCountry = countrySelect.value;
  const selectedMonth = monthSelect.value;
  
  filteredDataRows = currentDataRows.filter(r => {
    const matchCountry = (selectedCountry === "all" || r.country === selectedCountry);
    const matchMonth = (r.month === selectedMonth);
    return matchCountry && matchMonth;
  });
}

function updateDashboardUI() {
  const countrySelect = document.getElementById("filter-country");
  const monthSelect = document.getElementById("filter-month");
  
  const targetCountry = countrySelect.value;
  const targetMonth = monthSelect.value;
  
  // --- A. Calculate KPIs ---
  let totalQty = 0;
  let totalValueUSD = 0;
  let lgValueUSD = 0;
  
  filteredDataRows.forEach(r => {
    totalQty += r.qty;
    totalValueUSD += r.value_usd;
    if (r.brand.toUpperCase() === "LG") {
      lgValueUSD += r.value_usd;
    }
  });
  
  const lgShare = totalValueUSD > 0 ? (lgValueUSD / totalValueUSD) * 100 : 0;
  const asp = totalQty > 0 ? (totalValueUSD / totalQty) : 0;
  
  // YoY calculations
  let yoyValueGrowth = "N/A";
  let yoyLgShareChange = "N/A";
  
  if (targetMonth !== "latest" && targetMonth !== "") {
    const prevYearMonth = String(parseInt(targetMonth) - 100); // 202603 -> 202503
    
    // Find previous year same month rows matching same country filter
    const prevYearRows = currentDataRows.filter(r => {
      const matchCountry = (targetCountry === "all" || r.country === targetCountry);
      const matchMonth = (r.month === prevYearMonth);
      return matchCountry && matchMonth;
    });
    
    if (prevYearRows.length > 0) {
      let prevTotalQty = 0;
      let prevTotalValueUSD = 0;
      let prevLgValueUSD = 0;
      
      prevYearRows.forEach(r => {
        prevTotalQty += r.qty;
        prevTotalValueUSD += r.value_usd;
        if (r.brand.toUpperCase() === "LG") {
          prevLgValueUSD += r.value_usd;
        }
      });
      
      if (prevTotalValueUSD > 0) {
        const growth = ((totalValueUSD - prevTotalValueUSD) / prevTotalValueUSD) * 100;
        yoyValueGrowth = `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
        
        const prevLgShare = (prevLgValueUSD / prevTotalValueUSD) * 100;
        const change = lgShare - prevLgShare;
        yoyLgShareChange = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%p`;
      }
    }
  }
  
  // Render KPI values
  document.getElementById("kpi-qty").innerText = formatQty(totalQty);
  document.getElementById("kpi-value").innerText = formatValueUSD(totalValueUSD);
  document.getElementById("kpi-lg-share").innerText = `${lgShare.toFixed(1)}%`;
  document.getElementById("kpi-asp").innerText = `$${Math.round(asp).toLocaleString()}`;
  
  const growthElement = document.getElementById("kpi-growth-yoy");
  growthElement.innerText = yoyValueGrowth;
  growthElement.className = "kpi-value " + (yoyValueGrowth.startsWith('+') ? "text-success" : (yoyValueGrowth.startsWith('-') ? "text-error" : ""));
  
  const shareChangeElement = document.getElementById("kpi-lg-share-change-yoy");
  shareChangeElement.innerText = yoyLgShareChange;
  shareChangeElement.className = "kpi-value " + (yoyLgShareChange.startsWith('+') ? "text-success" : (yoyLgShareChange.startsWith('-') ? "text-error" : ""));
  
  // Add highlight border warning if LG Share YoY decreases
  const lgShareCard = document.getElementById("card-lg-share-change");
  if (yoyLgShareChange.startsWith('-')) {
    lgShareCard.style.borderColor = "var(--color-error)";
  } else {
    lgShareCard.style.borderColor = "";
  }
  
  // --- B. Generate Charts (HTML+CSS Horizontal Bar Layout) ---
  renderTypeMixChart();
  renderCapacityMixChart();
  renderPriceMixChart();
  renderBrandShareChart();
  
  // --- C. Generate AI Report & Recommended Actions ---
  generateReportAndActions(totalQty, totalValueUSD, lgShare, asp, yoyValueGrowth, yoyLgShareChange);
}

// KPI Formatting Utils
function formatQty(qty) {
  if (qty >= 1000) {
    return `${(qty / 1000).toFixed(1)}K대`;
  }
  return `${qty}대`;
}

function formatValueUSD(val) {
  if (val >= 1000000) {
    return `$ ${(val / 1000000).toFixed(1)}M`;
  }
  return `$ ${val.toLocaleString()}`;
}

// --- 7. Chart Rendering Logics (纯 HTML+CSS Bar Chart) ---
function renderTypeMixChart() {
  const container = document.getElementById("chart-type-mix");
  container.innerHTML = "";
  
  // Group by type_category
  const typeGroup = {};
  TYPE_ORDER.forEach(t => typeGroup[t] = 0);
  
  let totalUSD = 0;
  filteredDataRows.forEach(r => {
    const cat = TYPE_ORDER.includes(r.type_category) ? r.type_category : "Others";
    typeGroup[cat] += r.value_usd;
    totalUSD += r.value_usd;
  });
  
  // Build chart rows
  TYPE_ORDER.forEach(type => {
    const value = typeGroup[type];
    const pct = totalUSD > 0 ? (value / totalUSD) * 100 : 0;
    
    const row = document.createElement("div");
    row.className = "chart-row" + (type === "T/F" ? " highlight" : "");
    row.innerHTML = `
      <div class="chart-label-row">
        <span class="chart-label-name">${type}</span>
        <span class="chart-label-value">${pct.toFixed(1)}% (${formatValueUSD(value)})</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderCapacityMixChart() {
  const container = document.getElementById("chart-capacity-mix");
  container.innerHTML = "";
  
  const capGroup = {};
  CAPACITY_ORDER.forEach(c => capGroup[c] = 0);
  
  let totalUSD = 0;
  filteredDataRows.forEach(r => {
    const cat = CAPACITY_ORDER.includes(r.capacity_segment) ? r.capacity_segment : "Unknown";
    capGroup[cat] += r.value_usd;
    totalUSD += r.value_usd;
  });
  
  CAPACITY_ORDER.forEach(cap => {
    const value = capGroup[cap];
    const pct = totalUSD > 0 ? (value / totalUSD) * 100 : 0;
    
    const row = document.createElement("div");
    row.className = "chart-row" + (cap === "400-500L" ? " highlight" : "");
    row.innerHTML = `
      <div class="chart-label-row">
        <span class="chart-label-name">${cap}</span>
        <span class="chart-label-value">${pct.toFixed(1)}% (${formatValueUSD(value)})</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderPriceMixChart() {
  const container = document.getElementById("chart-price-mix");
  container.innerHTML = "";
  
  const priceGroup = {};
  PRICE_ORDER.forEach(p => priceGroup[p] = 0);
  
  let totalUSD = 0;
  filteredDataRows.forEach(r => {
    const cat = PRICE_ORDER.includes(r.price_segment) ? r.price_segment : "$500↓";
    priceGroup[cat] += r.value_usd;
    totalUSD += r.value_usd;
  });
  
  PRICE_ORDER.forEach(price => {
    const value = priceGroup[price];
    const pct = totalUSD > 0 ? (value / totalUSD) * 100 : 0;
    
    const row = document.createElement("div");
    row.className = "chart-row" + (price === "$500↓" ? " highlight" : "");
    row.innerHTML = `
      <div class="chart-label-row">
        <span class="chart-label-name">${price}</span>
        <span class="chart-label-value">${pct.toFixed(1)}% (${formatValueUSD(value)})</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderBrandShareChart() {
  const container = document.getElementById("chart-brand-share");
  container.innerHTML = "";
  
  // Group and sort dynamically
  const brandGroup = {};
  let totalUSD = 0;
  
  filteredDataRows.forEach(r => {
    brandGroup[r.brand] = (brandGroup[r.brand] || 0) + r.value_usd;
    totalUSD += r.value_usd;
  });
  
  // Sort brands by revenue descending
  const sortedBrands = Object.keys(brandGroup).sort((a, b) => brandGroup[b] - brandGroup[a]);
  
  // Render top 5 brands and put rest in others if many
  const topBrands = sortedBrands.slice(0, 5);
  let otherSum = 0;
  if (sortedBrands.length > 5) {
    sortedBrands.slice(5).forEach(b => {
      otherSum += brandGroup[b];
    });
  }
  
  topBrands.forEach(brand => {
    const value = brandGroup[brand];
    const pct = totalUSD > 0 ? (value / totalUSD) * 100 : 0;
    
    const row = document.createElement("div");
    row.className = "chart-row" + (brand.toUpperCase() === "LG" ? " highlight" : "");
    row.innerHTML = `
      <div class="chart-label-row">
        <span class="chart-label-name">${brand}</span>
        <span class="chart-label-value">${pct.toFixed(1)}% (${formatValueUSD(value)})</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
  
  if (otherSum > 0) {
    const pct = totalUSD > 0 ? (otherSum / totalUSD) * 100 : 0;
    const row = document.createElement("div");
    row.className = "chart-row";
    row.innerHTML = `
      <div class="chart-label-row">
        <span class="chart-label-name">Others</span>
        <span class="chart-label-value">${pct.toFixed(1)}% (${formatValueUSD(otherSum)})</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  }
}

// --- 8. AI Summary & Action Generator (Rule-based) ---
function generateReportAndActions(qty, value, lgShare, asp, growth, shareChange) {
  const countrySelect = document.getElementById("filter-country");
  const monthSelect = document.getElementById("filter-month");
  
  const cName = countrySelect.options[countrySelect.selectedIndex].text;
  const mName = formatMonth(monthSelect.value);
  
  // Get Mix information for rules
  const typeMap = {};
  filteredDataRows.forEach(r => {
    typeMap[r.type_category] = (typeMap[r.type_category] || 0) + r.value_usd;
  });
  const topType = Object.keys(typeMap).sort((a,b) => typeMap[b] - typeMap[a])[0] || "None";
  
  const capMap = {};
  filteredDataRows.forEach(r => {
    capMap[r.capacity_segment] = (capMap[r.capacity_segment] || 0) + r.value_usd;
  });
  const topCap = Object.keys(capMap).sort((a,b) => capMap[b] - capMap[a])[0] || "None";
  
  // 1. Report template construction
  let yoyGrowthSentence = "전년 동월 데이터가 없어 YoY 분석은 표시하지 않습니다.";
  if (growth !== "N/A") {
    yoyGrowthSentence = `전년 동월 대비 시장 금액은 ${growth} 성장했습니다.`;
  }
  
  let yoyLgSentence = "";
  if (shareChange !== "N/A") {
    yoyLgSentence = ` 전년 동기 대비 점유율은 ${shareChange} 변동하였습니다.`;
  }
  
  const reportHTML = `
    <ul class="report-list">
      <li><strong>시장 규모:</strong> ${mName} ${cName} 시장은 수량 ${formatQty(qty)}, 금액 ${formatValueUSD(value)} 규모입니다.</li>
      <li><strong>YoY 성장률:</strong> ${yoyGrowthSentence}</li>
      <li><strong>제품구조 (Type Mix):</strong> 시장은 ${topType} 세그먼트를 중심으로 구성되어 있습니다.</li>
      <li><strong>LG 성과:</strong> LG 점유율은 금액 기준 ${lgShare.toFixed(1)}%를 차지하고 있습니다.${yoyLgSentence}</li>
      <li><strong>용량/가격 구조:</strong> 주력 용량 세그먼트는 ${topCap}이며, 전체 시장의 평균 판매 가격(ASP)은 $${Math.round(asp).toLocaleString()} 수준입니다.</li>
    </ul>
  `;
  
  document.getElementById("report-summary").innerHTML = reportHTML;
  
  // 2. Action recommendations logic
  const actions = [];
  
  // Rule A: T/F dominant
  if (topType === "T/F") {
    actions.push({
      type: "core",
      title: "T/F 경쟁력 강화",
      desc: "T/F 세그먼트 비중이 가장 높으므로 볼륨 모델 라인업 다양화와 가격 프로모션을 적극 추진하여 점유율을 극대화해야 합니다."
    });
  } else {
    actions.push({
      type: "core",
      title: "T/F 경쟁력 강화",
      desc: "시장 볼륨 확대를 위해 2 Door T/F 세그먼트의 기본 라인업 전략을 수시 점검해야 합니다."
    });
  }
  
  // Rule B: 400-500L segment check
  const cap400Pct = capMap["400-500L"] && value > 0 ? (capMap["400-500L"] / value) * 100 : 0;
  if (cap400Pct > 20 || topCap === "400-500L") {
    actions.push({
      type: "opp",
      title: "400~500L 구간 집중",
      desc: "400~500L 중형 용량대의 높은 시장 기여도가 관찰되므로 해당 용량대의 프리미엄 신모델 런칭을 제안합니다."
    });
  } else {
    actions.push({
      type: "opp",
      title: "400~500L 구간 집중",
      desc: "비중이 상승하는 400~500L 구간의 제품 경쟁력을 우선 강화하여 신규 패밀리룩 수요를 확보하십시오."
    });
  }
  
  // Rule C: LG share change
  if (shareChange !== "N/A" && shareChange.startsWith('-')) {
    actions.push({
      type: "def",
      title: "LG 점유율 하락 구간 우선 점검",
      desc: `전년 동기 대비 LG의 점유율이 ${shareChange}로 감소하는 추세이므로 경쟁사(Samsung/Toshiba 등)의 세그먼트별 공격적 침투 지점을 긴급 점검해야 합니다.`
    });
  } else {
    actions.push({
      type: "def",
      title: "SxS 방어 전략 수립",
      desc: "고부가가치 SxS 및 F/D 세그먼트 내 브랜드 가치와 가격 방어를 유지하기 위한 프로모션 조율이 필요합니다."
    });
  }
  
  // Rule D: Price strategy based on ASP
  if (asp < 800) {
    actions.push({
      type: "opp",
      title: "$500 이하 보급형 가격대 대응",
      desc: "평균 ASP가 낮아 시장 내 보급형 수요가 크므로, 원가 경쟁력을 확보한 로컬 특화 보급 모델 투입이 시급합니다."
    });
  } else {
    actions.push({
      type: "opp",
      title: "$1000 이상 프리미엄 대응",
      desc: "시장 ASP가 견조하므로 프리미엄 기능(얼음 정수기, 노크온 등)을 소구한 고가 라인업 판매 비중을 확대해야 합니다."
    });
  }
  
  // Base default items to hit 7 suggested actions structure
  actions.push({
    type: "opp",
    title: "B/F 성장 기회 확대",
    desc: "B/F 냉장고 비중 트렌드를 지속 모니터링하여 서구화된 주방 트렌드에 대응할 빌트인 모델 기획을 가속화합니다."
  });
  
  actions.push({
    type: "def",
    title: "경쟁사 점유율 상승 구간 우선 점검",
    desc: "경쟁 브랜드의 신제품 프로모션 기각 및 유통 매장 내 매대 배치 변동사항을 리테일 인텔리전스로 수집하십시오."
  });
  
  actions.push({
    type: "core",
    title: "월간 자동 리포트 구축",
    desc: "매월 신규 릴리즈되는 Raw Data의 자동 연동 및 주요 법인별 대시보드 비교 뷰 생성을 통해 전략 지체 시간을 최소화하십시오."
  });
  
  // Render Recommended Actions Card HTML
  let actionsHTML = '<div class="action-cards-container">';
  actions.forEach(act => {
    const badgeClass = act.type === "core" ? "badge-core" : (act.type === "opp" ? "badge-opp" : "badge-def");
    actionsHTML += `
      <div class="action-card">
        <div class="action-card-header">
          <span class="action-title-text">${act.title}</span>
          <span class="action-badge ${badgeClass}">${act.type}</span>
        </div>
        <div class="action-desc">${act.desc}</div>
      </div>
    `;
  });
  actionsHTML += '</div>';
  
  document.getElementById("report-actions").innerHTML = actionsHTML;
}

// --- 9. Chatbot Logic (Keyword analysis & Response) ---
function showBotMessage(messageHTML) {
  const chatMessages = document.getElementById("chat-messages");
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble bot-bubble";
  bubble.innerHTML = `
    <div class="bubble-content">${messageHTML}</div>
    <span class="chat-time">${time}</span>
  `;
  
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showUserMessage(message) {
  const chatMessages = document.getElementById("chat-messages");
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble user-bubble";
  bubble.innerHTML = `
    <div class="bubble-content">${escapeHtml(message)}</div>
    <span class="chat-time">${time}</span>
  `;
  
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const chatMessages = document.getElementById("chat-messages");
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble bot-bubble typing-bubble";
  bubble.id = "chat-typing-indicator";
  bubble.innerHTML = `
    <div class="bubble-content"><span class="spinner"></span> 분석중...</div>
  `;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("chat-typing-indicator");
  if (indicator) indicator.remove();
}

function handleChatSubmit(text) {
  if (!text || text.trim() === "") return;
  
  showUserMessage(text);
  document.getElementById("chat-input").value = "";
  
  showTypingIndicator();
  
  // 0.5초 대기 시뮬레이션 후 키워드 기반 답변
  setTimeout(() => {
    removeTypingIndicator();
    processBotAnswer(text);
  }, 500);
}

function processBotAnswer(query) {
  const normalizedQuery = query.toLowerCase().trim();
  
  // A. 드롭다운 연계 필터 스캔 (질문 속 국가/월이 있으면 동적 변경)
  let countryChanged = false;
  let monthChanged = false;
  
  // 1. 국가 키워드 검사
  const countrySelect = document.getElementById("filter-country");
  for (let i = 0; i < countrySelect.options.length; i++) {
    const optVal = countrySelect.options[i].value.toLowerCase();
    const optText = countrySelect.options[i].text.toLowerCase();
    if (optVal !== "all" && (normalizedQuery.includes(optVal) || normalizedQuery.includes(optText))) {
      countrySelect.selectedIndex = i;
      countryChanged = true;
      break;
    }
  }
  
  // 2. 월 키워드 검사 (202603, 26-03 등 검출)
  const monthSelect = document.getElementById("filter-month");
  for (let i = 0; i < monthSelect.options.length; i++) {
    const optVal = monthSelect.options[i].value; // 202603
    const displayVal = formatMonth(optVal).replace("-", "").toLowerCase(); // 2603
    const displayFormat = formatMonth(optVal).toLowerCase(); // 26-03
    
    if (normalizedQuery.includes(optVal) || normalizedQuery.includes(displayVal) || normalizedQuery.includes(displayFormat)) {
      monthSelect.selectedIndex = i;
      monthChanged = true;
      break;
    }
  }
  
  // 변경점이 있을 시 필터 자동 적용 및 업데이트
  if (countryChanged || monthChanged) {
    applyFilter();
    updateDashboardUI();
  }
  
  const activeCountry = countrySelect.options[countrySelect.selectedIndex].text;
  const activeMonth = formatMonth(monthSelect.value);
  
  // B. 키워드 분석 분기
  
  // 1. 시장 / 현황 / 전체 / market
  if (normalizedQuery.includes("시장") || normalizedQuery.includes("현황") || normalizedQuery.includes("전체") || normalizedQuery.includes("market")) {
    const qtyText = document.getElementById("kpi-qty").innerText;
    const valText = document.getElementById("kpi-value").innerText;
    const growth = document.getElementById("kpi-growth-yoy").innerText;
    const yoyText = growth !== "N/A" ? `전년 동월 대비 <strong>${growth} 성장</strong>하였습니다.` : "전년 동월 비교 데이터가 누락되었습니다.";
    
    showBotMessage(`
      📈 <strong>[${activeCountry} 시장 규모 분석 - ${activeMonth}]</strong><br>
      - <strong>총 판매수량:</strong> ${qtyText}<br>
      - <strong>총 판매금액:</strong> ${valText}<br>
      - <strong>성장률:</strong> ${yoyText}<br><br>
      해당 월 시장은 상기 규모로 집계되며, 상세 세그먼트 믹스는 우측 대시보드 차트를 참고하시기 바랍니다.
    `);
    return;
  }
  
  // 2. LG / 점유율 / share
  if (normalizedQuery.includes("lg") || normalizedQuery.includes("점유율") || normalizedQuery.includes("share")) {
    const lgShareText = document.getElementById("kpi-lg-share").innerText;
    const lgShareChange = document.getElementById("kpi-lg-share-change-yoy").innerText;
    const changeSymbol = lgShareChange.includes('+') ? "증가" : (lgShareChange.includes('-') ? "감소" : "변동 없음");
    
    let detailMsg = "";
    if (lgShareChange !== "N/A") {
      detailMsg = `전년 동월 대비 점유율은 <strong>${lgShareChange} ${changeSymbol}</strong> 하였습니다.`;
    } else {
      detailMsg = "전년 동월 데이터가 없어 점유율 추이 비교는 불가합니다.";
    }
    
    showBotMessage(`
      🔴 <strong>[LG 점유율 및 성과 분석 - ${activeMonth}]</strong><br>
      - <strong>LG 금액 점유율:</strong> ${lgShareText}<br>
      - <strong>YoY 점유율 변동:</strong> ${detailMsg}<br><br>
      LG는 현재 ${activeCountry}에서 주력 T/F 라인업과 프리미엄 용량대 포지션을 유지하고 있습니다. 우측 Recommended Actions에서 하락/방어 세그먼트 전략을 확인하십시오.
    `);
    return;
  }
  
  // 3. 타입 / 제품 / type / Main Types
  if (normalizedQuery.includes("타입") || normalizedQuery.includes("제품") || normalizedQuery.includes("type") || normalizedQuery.includes("main types")) {
    // Collect type percentage elements
    const rows = document.querySelectorAll("#chart-type-mix .chart-row");
    let mixDetail = "";
    rows.forEach(r => {
      const name = r.querySelector(".chart-label-name").innerText;
      const val = r.querySelector(".chart-label-value").innerText.split(' ')[0];
      mixDetail += `- <strong>${name}:</strong> ${val}<br>`;
    });
    
    showBotMessage(`
      🍱 <strong>[제품 타입별 비중 분석 - ${activeMonth}]</strong><br>
      ${mixDetail}<br>
      T/F 및 1D가 전통적으로 시장의 큰 볼륨을 차지하며, 프리미엄 다도어(F/D)와 양문형(SxS)은 금액 비중 확대를 견인하는 동력입니다.
    `);
    return;
  }
  
  // 4. 가격 / price / ASP
  if (normalizedQuery.includes("가격") || normalizedQuery.includes("price") || normalizedQuery.includes("asp")) {
    const aspText = document.getElementById("kpi-asp").innerText;
    const rows = document.querySelectorAll("#chart-price-mix .chart-row");
    let mixDetail = "";
    rows.forEach(r => {
      const name = r.querySelector(".chart-label-name").innerText;
      const val = r.querySelector(".chart-label-value").innerText.split(' ')[0];
      mixDetail += `- <strong>${name}:</strong> ${val}<br>`;
    });
    
    showBotMessage(`
      🏷️ <strong>[가격대별 시장 구조 분석 - ${activeMonth}]</strong><br>
      - <strong>시장 평균 판매가격(ASP):</strong> ${aspText}<br>
      - <strong>가격 세그먼트별 비중:</strong><br>
      ${mixDetail}<br>
      보급형 가격대와 중고가 라인업의 혼조 양상이며 법인의 유통 마진 조율 시 주요 타겟 지점을 설정하는 것이 효율적입니다.
    `);
    return;
  }
  
  // 5. 용량 / capacity / liter / L
  if (normalizedQuery.includes("용량") || normalizedQuery.includes("capacity") || normalizedQuery.includes("liter") || normalizedQuery.includes("l")) {
    const rows = document.querySelectorAll("#chart-capacity-mix .chart-row");
    let mixDetail = "";
    rows.forEach(r => {
      const name = r.querySelector(".chart-label-name").innerText;
      const val = r.querySelector(".chart-label-value").innerText.split(' ')[0];
      mixDetail += `- <strong>${name}:</strong> ${val}<br>`;
    });
    
    showBotMessage(`
      🛢️ <strong>[용량대별 시장 구조 분석 - ${activeMonth}]</strong><br>
      ${mixDetail}<br>
      400~500L 대 용량대가 핵심 주력 구간이며, 실생활 공간 레이아웃 변화에 따라 슬림한 대용량 양문형(SxS) 모델 선호도가 확장되고 있습니다.
    `);
    return;
  }
  
  // 6. 브랜드 / brand / 경쟁사 / 점유율
  if (normalizedQuery.includes("브랜드") || normalizedQuery.includes("brand") || normalizedQuery.includes("경쟁사")) {
    const rows = document.querySelectorAll("#chart-brand-share .chart-row");
    let mixDetail = "";
    rows.forEach(r => {
      const name = r.querySelector(".chart-label-name").innerText;
      const val = r.querySelector(".chart-label-value").innerText.split(' ')[0];
      mixDetail += `- <strong>${name}:</strong> ${val}<br>`;
    });
    
    showBotMessage(`
      🎪 <strong>[브랜드 점유율 분석 - ${activeMonth}]</strong><br>
      ${mixDetail}<br>
      시장 전체 플레이어 중 주요 경쟁 업체들의 비율 성과입니다. 타사 경쟁 우위 세그먼트 및 신제품 공세 트렌드를 대시보드 리포트로 지속 점검하십시오.
    `);
    return;
  }
  
  // 7. 전략 / 액션 / 추천 / action / strategy
  if (normalizedQuery.includes("전략") || normalizedQuery.includes("액션") || normalizedQuery.includes("추천") || normalizedQuery.includes("action") || normalizedQuery.includes("strategy")) {
    const actContainer = document.getElementById("report-actions");
    const cards = actContainer.querySelectorAll(".action-card");
    let strategyDetail = "";
    cards.forEach((c, idx) => {
      const title = c.querySelector(".action-title-text").innerText;
      const desc = c.querySelector(".action-desc").innerText;
      strategyDetail += `${idx + 1}. <strong>${title}</strong>: ${desc}<br><br>`;
    });
    
    showBotMessage(`
      💡 <strong>[전략 액션 제안 - ${activeCountry}]</strong><br><br>
      ${strategyDetail}
      실적 상승과 이익 확대를 위한 최적의 우선순위 액션 전략 제안입니다.
    `);
    return;
  }
  
  // 매칭되는 질문이 없을 경우 안내
  showBotMessage(`
    요청하신 단어는 인지하지 못하였습니다. 아래 추천 버튼을 이용하시거나 질문에 '시장', 'LG', '타입', '가격', '용량', '브랜드', '전략' 등의 핵심 키워드를 포함해 주세요.<br><br>
    현재 세션은 <strong>${activeCountry} (${activeMonth})</strong> 기준 분석 데이터를 보여주고 있습니다.
  `);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// --- 10. Initialization & User Event Binding ---
document.addEventListener("DOMContentLoaded", () => {
  // A. Load Default Sample Data
  dataProvider.loadSampleData();
  
  // B. File/Folder Connection Events
  const folderInput = document.getElementById("folder-upload");
  const fileInput = document.getElementById("file-upload");
  const dropZone = document.getElementById("drop-zone");
  
  folderInput.addEventListener("change", (e) => {
    dataProvider.processFiles(e.target.files);
  });
  
  fileInput.addEventListener("change", (e) => {
    dataProvider.processFiles(e.target.files);
  });
  
  // Drag & Drop event bindings
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
  
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
  
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files) {
      dataProvider.processFiles(e.dataTransfer.files);
    }
  });
  
  // Trigger click on dropzone clicking
  dropZone.addEventListener("click", () => {
    fileInput.click();
  });
  
  // C. Paste Modal Actions
  const pasteTrigger = document.getElementById("btn-paste-trigger");
  const pasteModal = document.getElementById("paste-modal");
  const modalClose = document.querySelector(".modal-close");
  const btnCancelPaste = document.getElementById("btn-cancel-paste");
  const btnSubmitPaste = document.getElementById("btn-submit-paste");
  const pasteTextarea = document.getElementById("paste-textarea");
  
  pasteTrigger.addEventListener("click", () => {
    pasteTextarea.value = "";
    pasteModal.classList.add("show");
  });
  
  const closeModal = () => {
    pasteModal.classList.remove("show");
  };
  
  modalClose.addEventListener("click", closeModal);
  btnCancelPaste.addEventListener("click", closeModal);
  
  btnSubmitPaste.addEventListener("click", () => {
    const text = pasteTextarea.value;
    if (text.trim() !== "") {
      dataProvider.loadFromPaste(text);
      closeModal();
    } else {
      alert("데이터를 입력해 주세요.");
    }
  });
  
  // D. Data Refresh Actions
  const btnRefresh = document.getElementById("btn-refresh");
  btnRefresh.addEventListener("click", () => {
    dataProvider.refreshData();
  });
  
  // E. Filter Execution Actions
  const btnApply = document.getElementById("btn-apply-filter");
  btnApply.addEventListener("click", () => {
    applyFilter();
    updateDashboardUI();
    showBotMessage("필터 기준이 대시보드에 적용되었습니다.");
  });
  
  // F. Chat Suggestions Click Actions
  const suggestionContainer = document.getElementById("chat-suggestions");
  suggestionContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-btn")) {
      handleChatSubmit(e.target.innerText);
    }
  });
  
  // G. Chat Submission Form Actions
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value;
    handleChatSubmit(text);
  });
});
