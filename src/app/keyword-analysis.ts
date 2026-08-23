type JsonRecord = Record<string, unknown>;

export type KeywordPoint = {
  count: number;
  keyword: string;
  order: number;
  sessionLabel?: string;
};

export type KeywordSummary = {
  count: number;
  keyword: string;
  percentage: number;
};

export type KeywordTrend = {
  keyword: string;
  values: number[];
};

export type KeywordUtterance = {
  page?: number;
  text: string;
  timestamp?: string;
  turnIndex?: number;
};

export type KeywordDashboardData = {
  groups: string[];
  points: KeywordPoint[];
  summaries: KeywordSummary[];
  totalMentions: number;
  trends: KeywordTrend[];
  uniqueKeywords: number;
  utterances: KeywordUtterance[];
  usesMockHistory: boolean;
};

const MOCK_KEYWORD_HISTORY = [
  { label: "1회기", counts: [6, 3, 1, 4, 2] },
  { label: "2회기", counts: [7, 5, 2, 5, 3] },
  { label: "3회기", counts: [5, 6, 4, 3, 4] },
  { label: "4회기", counts: [4, 4, 3, 6, 5] },
  { label: "5회기", counts: [3, 2, 5, 4, 5] },
] as const;

const MOCK_TREND_KEYWORDS = ["과제", "그냥", "동생", "성적", "수업"] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseJsonText(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return value;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return value;
  }
}

function findKeywordSource(value: unknown, depth = 0): unknown {
  const parsed = parseJsonText(value);
  if (depth > 8 || !isRecord(parsed)) return null;

  const direct =
    parsed.client_utterance_keywords ?? parsed.clientUtteranceKeywords;
  if (direct !== undefined && direct !== null) return direct;

  for (const nestedValue of Object.values(parsed)) {
    if (isRecord(nestedValue) || Array.isArray(nestedValue)) {
      if (Array.isArray(nestedValue)) {
        for (const item of nestedValue) {
          const found = findKeywordSource(item, depth + 1);
          if (found !== null) return found;
        }
      } else {
        const found = findKeywordSource(nestedValue, depth + 1);
        if (found !== null) return found;
      }
    }
  }

  return null;
}

function findClientUtteranceSource(value: unknown, depth = 0): unknown {
  const parsed = parseJsonText(value);
  if (depth > 8 || !isRecord(parsed)) return null;

  const direct = parsed.client_utterances ?? parsed.clientUtterances;
  if (direct !== undefined && direct !== null) return direct;

  const prioritizedValues = [
    parsed.speakerSelection,
    parsed.clientTranscript,
    parsed.analysisResult,
    ...Object.values(parsed),
  ];

  for (const nestedValue of prioritizedValues) {
    if (isRecord(nestedValue)) {
      const found = findClientUtteranceSource(nestedValue, depth + 1);
      if (found !== null) return found;
    }
  }

  return null;
}

export function readReadableStructuredText(
  value: unknown,
  depth = 0,
): string | null {
  const parsed = parseJsonText(value);
  if (depth > 8 || !isRecord(parsed)) return null;

  const direct =
    parsed.readable_structured_text ?? parsed.readableStructuredText;
  if (direct !== undefined && direct !== null) {
    if (typeof direct === "string") {
      return direct.trim() || null;
    }

    if (isRecord(direct) || Array.isArray(direct)) {
      return JSON.stringify(direct, null, 2);
    }

    return String(direct);
  }

  const prioritizedValues = [
    parsed.realtimeNote,
    parsed.analysisResult,
    ...Object.values(parsed),
  ];

  for (const nestedValue of prioritizedValues) {
    if (isRecord(nestedValue) || typeof nestedValue === "string") {
      const found = readReadableStructuredText(nestedValue, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function collectClientUtterances(response: unknown): KeywordUtterance[] {
  const source = findClientUtteranceSource(response);
  if (!Array.isArray(source)) return [];

  return source.flatMap((utterance) => {
    if (!isRecord(utterance)) return [];

    const text = asText(
      utterance.utterance_text ?? utterance.utteranceText ?? utterance.text,
    );
    if (!text) return [];

    const pageValue = Number(utterance.page);
    const turnValue = Number(utterance.turn_index ?? utterance.turnIndex);

    return [
      {
        text,
        timestamp:
          asText(
            utterance.timestamp_original ??
              utterance.timestampOriginal ??
              utterance.timestamp,
          ) ?? undefined,
        page: Number.isFinite(pageValue) ? pageValue : undefined,
        turnIndex: Number.isFinite(turnValue) ? turnValue : undefined,
      },
    ];
  });
}

function sessionSortValue(label: string): number {
  const matchedNumber = label.match(/\d+(?:\.\d+)?/);
  return matchedNumber ? Number(matchedNumber[0]) : Number.MAX_SAFE_INTEGER;
}

function readSessionLabel(record: JsonRecord): string | null {
  return asText(
    record.session_number ??
      record.sessionNumber ??
      record.session_label ??
      record.sessionLabel ??
      record.session,
  );
}

function readOrder(record: JsonRecord, fallback: number): number {
  const value =
    record.turn_index ??
    record.turnIndex ??
    record.utterance_index ??
    record.utteranceIndex ??
    record.page;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readKeyword(record: JsonRecord): string | null {
  return asText(
    record.keyword ??
      record.word ??
      record.term ??
      record.token ??
      record.name,
  );
}

function collectKeywordPoints(source: unknown): KeywordPoint[] {
  const points: KeywordPoint[] = [];
  let sequence = 0;

  const addPoint = (
    keyword: string,
    count: number,
    order: number,
    sessionLabel?: string | null,
  ) => {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword || count <= 0) return;

    points.push({
      keyword: normalizedKeyword,
      count,
      order,
      sessionLabel: sessionLabel ?? undefined,
    });
  };

  const visit = (
    value: unknown,
    context: { order: number; sessionLabel?: string | null },
    advanceArrayOrder = true,
  ) => {
    const parsed = parseJsonText(value);

    if (typeof parsed === "string") {
      addPoint(parsed, 1, context.order, context.sessionLabel);
      return;
    }

    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        if (advanceArrayOrder) sequence += 1;
        visit(
          item,
          {
            ...context,
            order: advanceArrayOrder ? sequence : context.order,
          },
          advanceArrayOrder,
        );
      });
      return;
    }

    if (!isRecord(parsed)) return;

    const sessionLabel = readSessionLabel(parsed) ?? context.sessionLabel;
    const order = readOrder(parsed, context.order);
    const keyword = readKeyword(parsed);

    if (keyword) {
      addPoint(
        keyword,
        asCount(
          parsed.count ??
            parsed.frequency ??
            parsed.occurrences ??
            parsed.total,
        ) ?? 1,
        order,
        sessionLabel,
      );
      return;
    }

    const nestedKeywords =
      parsed.keywords ?? parsed.keyword_list ?? parsed.keywordList;
    if (nestedKeywords !== undefined) {
      visit(nestedKeywords, { order, sessionLabel }, false);
      return;
    }

    const entries = Object.entries(parsed);
    const isCountMap =
      entries.length > 0 &&
      entries.every(([, item]) => asCount(item) !== null);

    if (isCountMap) {
      entries.forEach(([mappedKeyword, count]) => {
        addPoint(
          mappedKeyword,
          asCount(count) ?? 1,
          order,
          sessionLabel,
        );
      });
      return;
    }

    entries.forEach(([key, nestedValue]) => {
      if (Array.isArray(nestedValue) || isRecord(nestedValue)) {
        const nestedSession = /회기|session/i.test(key) ? key : sessionLabel;
        visit(nestedValue, { order, sessionLabel: nestedSession });
      }
    });
  };

  visit(source, { order: 0 });
  return points;
}

export function buildKeywordDashboardData(
  response: unknown,
): KeywordDashboardData | null {
  const source = findKeywordSource(response);
  if (source === null) return null;

  const points = collectKeywordPoints(source);
  if (points.length === 0) return null;

  const totals = new Map<string, number>();
  points.forEach((point) => {
    totals.set(point.keyword, (totals.get(point.keyword) ?? 0) + point.count);
  });

  const totalMentions = [...totals.values()].reduce(
    (sum, count) => sum + count,
    0,
  );
  const summaries = [...totals.entries()]
    .map(([keyword, count]) => ({
      keyword,
      count,
      percentage: totalMentions > 0 ? (count / totalMentions) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, "ko"));

  const sessionLabels = [
    ...new Set(
      points
        .map((point) => point.sessionLabel)
        .filter((label): label is string => Boolean(label)),
    ),
  ].sort(
    (a, b) =>
      sessionSortValue(a) - sessionSortValue(b) || a.localeCompare(b, "ko"),
  );

  const hasHistoricalSessions = sessionLabels.length > 1;
  const groups = hasHistoricalSessions
    ? sessionLabels
    : [...MOCK_KEYWORD_HISTORY.map((session) => session.label), "현재 분석"];
  const trends = hasHistoricalSessions
    ? summaries.map(({ keyword }) => {
        const values = Array.from({ length: groups.length }, () => 0);
        points.forEach((point) => {
          if (point.keyword !== keyword) return;
          const sessionIndex = sessionLabels.indexOf(point.sessionLabel ?? "");
          if (sessionIndex >= 0) values[sessionIndex] += point.count;
        });
        return { keyword, values };
      })
    : MOCK_TREND_KEYWORDS.map((keyword, keywordIndex) => ({
        keyword,
        values: [
          ...MOCK_KEYWORD_HISTORY.map(
            (session) => session.counts[keywordIndex],
          ),
          totals.get(keyword) ?? 0,
        ],
      }));

  return {
    groups,
    points,
    summaries,
    totalMentions,
    trends,
    uniqueKeywords: totals.size,
    utterances: collectClientUtterances(response),
    usesMockHistory: !hasHistoricalSessions,
  };
}
