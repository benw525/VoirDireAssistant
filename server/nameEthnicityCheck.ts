const SOUTH_ASIAN_SURNAMES = new Set([
  "ACHARYA", "AGARWAL", "AGGARWAL", "AGRAWAL", "AHMED", "AKHTAR", "ALI", "AMIN",
  "ANAND", "ARORA", "BAJAJ", "BALA", "BANERJEE", "BASU", "BEDI", "BHANDARI",
  "BHARDWAJ", "BHAT", "BHATIA", "BHATT", "BHATTACHARYA", "BHATTI", "BISWAS",
  "BOSE", "CHAKRABORTY", "CHAND", "CHANDRA", "CHATTERJEE", "CHAUDHARY", "CHAUDHRY",
  "CHAUHAN", "CHOPRA", "CHOUDHURY", "DAS", "DASGUPTA", "DATTA", "DESAI", "DESHMUKH",
  "DESHPANDE", "DEVARAKONDA", "DEVI", "DHILLON", "DIXIT", "DUTT", "DUTTA",
  "GANDHI", "GANGULY", "GHOSH", "GILL", "GOSWAMI", "GOYAL", "GROVER", "GUHA",
  "GUNDALA", "GUPTA", "HUSSAIN", "IYER", "JAIN", "JAISWAL", "JOSHI", "KADAM",
  "KALRA", "KAPOOR", "KAPURIA", "KAPUR", "KAUR", "KHAN", "KHANNA", "KOHLI",
  "KRISHNA", "KUMAR", "LAKSHMANAN", "MALHOTRA", "MALIK", "MANCHANDA", "MANI",
  "MATHUR", "MEHRA", "MEHTA", "MENON", "MISHRA", "MISRA", "MITRA", "MODY",
  "MOHAN", "MUKHERJEE", "MURTHY", "NAIDU", "NAIR", "NANDA", "NARANG", "NARAYAN",
  "NATH", "OBEROI", "PADMANABHAN", "PANDEY", "PANDIT", "PANT", "PARIKH", "PATEL",
  "PATHAK", "PATIL", "PRASAD", "PUNJ", "RAGHAVAN", "RAI", "RAJAN", "RAJPUT",
  "RAMAN", "RAMESH", "RANA", "RANGANATHAN", "RAO", "RATHORE", "RAUT", "RAWAT",
  "RAY", "REDDY", "ROY", "SAHAI", "SAHA", "SAHNI", "SAINI", "SANKAR",
  "SAXENA", "SEN", "SENGUPTA", "SETH", "SETHI", "SHAH", "SHARMA", "SHASTRI",
  "SHUKLA", "SIDHU", "SINGH", "SINHA", "SIRCAR", "SONI", "SOOD", "SRINIVASAN",
  "SUBRAMANIAM", "SUNDARAM", "TANDON", "TEWARI", "THAKUR", "TIWARI", "TRIVEDI",
  "VARMA", "VASHISHT", "VENKATESH", "VERMA", "VIKRAM", "VISHWAKARMA", "VOHRA",
  "YADAV",
]);

const EAST_ASIAN_SURNAMES = new Set([
  "AN", "BAE", "BAI", "CAI", "CAO", "CHAN", "CHANG", "CHAO", "CHEN", "CHENG",
  "CHEUNG", "CHI", "CHIN", "CHIU", "CHO", "CHOI", "CHONG", "CHOW", "CHU",
  "CHUA", "CHUN", "CHUNG", "DAI", "DENG", "DING", "DONG", "DU", "FAN", "FANG",
  "FENG", "FOO", "FU", "GAO", "GOH", "GU", "GUO", "HA", "HAN", "HAO",
  "HAYASHI", "HE", "HONG", "HOU", "HSU", "HU", "HUANG", "HWANG", "IM",
  "ITO", "JANG", "JEON", "JIANG", "JIN", "JUNG", "KANG", "KAWAI", "KIM",
  "KIMURA", "KO", "KOBAYASHI", "KONDO", "KONG", "KOO", "KUANG", "KUDO",
  "KWAK", "KWAN", "KWON", "LAI", "LAM", "LAU", "LEE", "LEUNG", "LI",
  "LIANG", "LIM", "LIN", "LING", "LIU", "LO", "LU", "LUO", "LUU",
  "MA", "MAK", "MAO", "MATSUDA", "MATSUMOTO", "MIN", "MING", "MOK",
  "MOON", "MORI", "MORIMOTO", "MURAKAMI", "NAKAMURA", "NAM", "NG", "NGUYEN",
  "NIU", "NOH", "ODA", "OH", "OKADA", "ONG", "OZAWA", "PAN", "PARK",
  "PENG", "PHAM", "QI", "QIAN", "QIN", "QIU", "REN", "RHEE", "RYU",
  "SAITO", "SATO", "SEO", "SHAO", "SHEN", "SHI", "SHIM", "SHIN",
  "SON", "SONG", "SU", "SUN", "SUZUKI", "TAKAHASHI", "TANAKA",
  "TANG", "TAO", "TENG", "TIAN", "TRAN", "TSAI", "TU", "VO",
  "WAN", "WANG", "WEI", "WEN", "WONG", "WOO", "WU", "XI", "XIA", "XIAO",
  "XIE", "XIN", "XIONG", "XU", "XUE", "YAMADA", "YAMAMOTO", "YAN",
  "YANG", "YAO", "YE", "YI", "YIN", "YIP", "YOO", "YOON", "YU",
  "YUAN", "YUE", "YUN", "ZENG", "ZHANG", "ZHAO", "ZHENG", "ZHONG",
  "ZHOU", "ZHU", "ZOU",
]);

const HISPANIC_SURNAMES = new Set([
  "ACEVEDO", "ACOSTA", "AGUILAR", "AGUIRRE", "ALBA", "ALCALA", "ALFARO",
  "ALONSO", "ALVARADO", "ALVAREZ", "AMAYA", "ANDRADE", "ARCE", "ARELLANO",
  "ARIAS", "AVILA", "AYALA", "BAEZ", "BARRERA", "BARRIOS", "BAUTISTA",
  "BECERRA", "BENAVIDES", "BERMUDEZ", "BLANCO", "BONILLA", "BRAVO", "BUSTAMANTE",
  "CABALLERO", "CABRERA", "CALDERON", "CAMACHO", "CAMPOS", "CARDENAS", "CARRASCO",
  "CARRILLO", "CASTANEDA", "CASTILLO", "CASTRO", "CERVANTES", "CHAVEZ", "CISNEROS",
  "CONTRERAS", "CORDOVA", "CORONA", "CORREA", "CORTEZ", "CRUZ", "CUELLAR",
  "DAVILA", "DELACRUZ", "DELEON", "DELGADO", "DIAZ", "DOMINGUEZ", "DUARTE",
  "DURAN", "ELIZONDO", "ENRIQUEZ", "ESCALANTE", "ESCOBAR", "ESPINOSA", "ESPINOZA",
  "ESQUIVEL", "ESTRADA", "FAJARDO", "FERNANDEZ", "FIGUEROA", "FLORES", "FUENTES",
  "GALINDO", "GALLEGOS", "GALVAN", "GARCIA", "GARZA", "GODINEZ", "GOMEZ",
  "GONZALEZ", "GUERRERO", "GUTIERREZ", "GUZMAN", "HENRIQUEZ", "HERNANDEZ",
  "HERRERA", "HIDALGO", "HURTADO", "IBARRA", "JARAMILLO", "JIMENEZ", "JUAREZ",
  "LARA", "LEON", "LEYVA", "LIRA", "LOMAS", "LOPEZ", "LOZANO", "LUNA",
  "MACIAS", "MADRIGAL", "MALDONADO", "MARIN", "MARQUEZ", "MARTINEZ", "MATA",
  "MEDINA", "MEJIA", "MELENDEZ", "MENA", "MENDEZ", "MENDOZA", "MERCADO",
  "MIRANDA", "MOLINA", "MONTES", "MONTOYA", "MORA", "MORALES", "MORENO",
  "MUNOZ", "MURILLO", "NAVA", "NAVARRETE", "NAVARRO", "NIETO", "NORIEGA",
  "NUNEZ", "OCAMPO", "OCHOA", "OJEDA", "OLIVARES", "OLIVAS", "OLVERA",
  "ONTIVEROS", "OROZCO", "ORTA", "ORTEGA", "ORTIZ", "OSORIO", "OTERO",
  "PACHECO", "PADILLA", "PALACIO", "PALACIOS", "PANTOJA", "PAREDES", "PARRA",
  "PENA", "PERALTA", "PEREZ", "PINEDA", "PLATA", "PORTILLO", "POSADA",
  "PRECIADO", "PRIETO", "QUINTANA", "QUINTERO", "QUIROZ", "RAMIREZ", "RAMOS",
  "RANGEL", "REYES", "RIOS", "RIVAS", "RIVERA", "ROBLES", "ROCHA", "RODARTE",
  "RODRIGUEZ", "ROJAS", "ROJO", "ROMAN", "ROMERO", "ROSALES", "RUBIO",
  "RUIZ", "SAAVEDRA", "SALAS", "SALAZAR", "SALDANA", "SALINAS", "SANCHEZ",
  "SANDOVAL", "SANTANA", "SANTIAGO", "SANTOS", "SAUCEDO", "SEGURA", "SEPULVEDA",
  "SERRANO", "SIERRA", "SILVA", "SOLIS", "SOLORZANO", "SOSA", "SOTELO", "SOTO",
  "SUAREZ", "TAPIA", "TELLEZ", "TERRAZAS", "TOBAR", "TOLEDO", "TORRES",
  "TREJO", "TREVINO", "TRUJILLO", "URIBE", "VALDES", "VALDEZ", "VALENCIA",
  "VALENZUELA", "VALLEJO", "VARELA", "VARGAS", "VASQUEZ", "VEGA", "VELA",
  "VELASCO", "VELASQUEZ", "VELAZQUEZ", "VELEZ", "VERA", "VIDAL", "VILLA",
  "VILLAGOMEZ", "VILLANUEVA", "VILLARREAL", "VILLEGAS", "YANEZ", "ZAMBRANO",
  "ZAMORA", "ZAPATA", "ZAVALA", "ZUNIGA",
]);

const MIDDLE_EASTERN_SURNAMES = new Set([
  "ABBAS", "ABDEL", "ABDALLAH", "ABDULLAH", "ABED", "ABIDI", "ABOU", "ABUBAKAR",
  "ACHOUR", "ADEL", "AFZAL", "AHMADI", "AJAMI", "AKBAR", "AKHTAR", "ALAVI",
  "AMINI", "ANWAR", "ARAFAT", "ARIF", "ASADI", "ASSADI", "ATTAR", "AZIZ",
  "BAGHERI", "BAKHTIARI", "BEHZADI", "DARVISH", "EBRAHIMI", "ESHRAGHI",
  "FARAHANI", "FARSI", "GHAFFARI", "GHASEMI", "GOLESTANI", "HABIBI", "HADDAD",
  "HAFEZ", "HAJJAR", "HAKIMI", "HAMID", "HAMIDI", "HASHEMI", "HASHIM",
  "HASSAN", "HOSSEINI", "HUSSAINI", "IBRAHIM", "IQBAL", "ISMAIL", "JABBAR",
  "JAFARI", "JALALI", "JAMIL", "KARIMI", "KAZEMI", "KHALID", "KHALIL",
  "KHOURY", "MAJID", "MANSOUR", "MANSOURI", "MAZAHERI", "MIRZA", "MOHAMMADI",
  "MORADI", "MOUSAVI", "NABI", "NAJAFI", "NASIR", "NAWAZ", "NOURI",
  "QURESHI", "RABBANI", "RAHMANI", "RASHID", "RAZA", "REZAEI", "SABERI",
  "SADEGHI", "SAFARI", "SALEHI", "SALEH", "SAMADI", "SHAFIEI", "SHARIFI",
  "SHIRAZI", "SIDDIQUI", "SOLTAN", "SULTANI", "TAHERI", "TALEB", "TARIQ",
  "YOUSSEF", "YOUSUF", "ZAFAR", "ZAHEDI", "ZAIDI", "ZAMANI", "ZARE",
]);

interface DemographicFlag {
  jurorNumber: number;
  field: "race";
  currentValue: string;
  suggestedOrigin: string;
  message: string;
}

const RACE_LABELS: Record<string, string> = {
  W: "White",
  B: "Black",
  H: "Hispanic",
  A: "Asian",
  O: "Other",
  U: "Unknown",
};

function getSurnameOrigin(surname: string): string | null {
  const upper = surname.toUpperCase().trim();
  if (SOUTH_ASIAN_SURNAMES.has(upper)) return "South Asian";
  if (EAST_ASIAN_SURNAMES.has(upper)) return "East Asian";
  if (HISPANIC_SURNAMES.has(upper)) return "Hispanic/Latino";
  if (MIDDLE_EASTERN_SURNAMES.has(upper)) return "Middle Eastern";
  return null;
}

function extractSurname(fullName: string): string {
  const cleaned = fullName.trim().replace(/[,;]+/g, " ");
  const parts = cleaned.split(/\s+/);
  return parts[0] || "";
}

export function checkNameEthnicityPlausibility(
  jurors: Array<{ number: number; name: string; race: string }>
): DemographicFlag[] {
  const flags: DemographicFlag[] = [];

  for (const juror of jurors) {
    const surname = extractSurname(juror.name);
    if (!surname) continue;

    const suggestedOrigin = getSurnameOrigin(surname);
    if (!suggestedOrigin) continue;

    const race = (juror.race || "U").toUpperCase().trim();
    const raceLabel = RACE_LABELS[race] || race;

    let mismatch = false;

    if (suggestedOrigin === "South Asian" && race !== "A" && race !== "O" && race !== "U") {
      mismatch = true;
    } else if (suggestedOrigin === "East Asian" && race !== "A" && race !== "O" && race !== "U") {
      mismatch = true;
    } else if (suggestedOrigin === "Hispanic/Latino" && race !== "H" && race !== "O" && race !== "U") {
      mismatch = true;
    } else if (suggestedOrigin === "Middle Eastern" && race !== "W" && race !== "O" && race !== "U") {
      mismatch = true;
    }

    if (mismatch) {
      flags.push({
        jurorNumber: juror.number,
        field: "race",
        currentValue: raceLabel,
        suggestedOrigin,
        message: `Name origin suggests this juror may not be ${raceLabel}. The surname "${surname}" is commonly associated with ${suggestedOrigin} heritage. Please verify.`,
      });
    }
  }

  return flags;
}

export function checkEnrichmentEthnicityConflict(
  race: string,
  enrichmentText: string
): string | null {
  if (!enrichmentText) return null;

  const lower = enrichmentText.toLowerCase();
  const raceUpper = race.toUpperCase().trim();

  const ethnicityMentions: Array<{ pattern: RegExp; origin: string; compatibleRaces: string[] }> = [
    { pattern: /\b(south asian|indian[- ]american|indian heritage|hindu|sikh|gujarati|punjabi|tamil|bengali|maharashtrian|telugu)\b/i, origin: "South Asian", compatibleRaces: ["A", "O"] },
    { pattern: /\b(east asian|chinese[- ]american|japanese[- ]american|korean[- ]american|vietnamese[- ]american|chinese heritage|japanese heritage|korean heritage)\b/i, origin: "East Asian", compatibleRaces: ["A", "O"] },
    { pattern: /\b(hispanic|latino|latina|latinx|mexican[- ]american|cuban[- ]american|puerto rican|salvadoran|guatemalan|dominican|colombian)\b/i, origin: "Hispanic/Latino", compatibleRaces: ["H", "O"] },
    { pattern: /\b(middle eastern|arab[- ]american|iranian[- ]american|persian|lebanese[- ]american|iraqi|syrian|palestinian|egyptian[- ]american|turkish)\b/i, origin: "Middle Eastern", compatibleRaces: ["W", "O"] },
    { pattern: /\b(african[- ]american|black community|historically black|HBCU|african heritage)\b/i, origin: "Black/African American", compatibleRaces: ["B", "O"] },
  ];

  for (const { pattern, origin, compatibleRaces } of ethnicityMentions) {
    if (pattern.test(lower)) {
      if (!compatibleRaces.includes(raceUpper) && raceUpper !== "U") {
        return `Enrichment data suggests ${origin} background, which may conflict with the recorded race of "${RACE_LABELS[raceUpper] || raceUpper}". Please verify.`;
      }
    }
  }

  return null;
}
