"use client";

import { useState } from "react";
import {
  buildKeywordDashboardData,
  readReadableStructuredText,
} from "./keyword-analysis";
import styles from "./page.module.css";

function trendColor(index: number) {
  return `hsl(${(index * 47 + 210) % 360} 58% 54%)`;
}

function includesKeyword(text: string, keyword: string) {
  const normalizedText = text.replace(/\s+/g, " ").toLocaleLowerCase("ko");
  const normalizedKeyword = keyword
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ko");
  const keywordStem = normalizedKeyword.endsWith("다")
    ? normalizedKeyword.slice(0, -1)
    : normalizedKeyword;

  return (
    normalizedText.includes(normalizedKeyword) ||
    (keywordStem.length > 1 && normalizedText.includes(keywordStem))
  );
}

type KeywordDashboardProps = {
  onReset: () => void;
  result: unknown;
};

function RealtimeNoteCard({ text }: { text: string }) {
  return (
    <article className={`${styles.resultCard} ${styles.realtimeNoteCard}`}>
      <div className={styles.eyebrow}>실시간 기록</div>
      <h2>상담 기록</h2>
      <p>업로드한 realtime_note 문서에서 정리된 내용입니다.</p>
      <div className={styles.realtimeNoteText}>{text}</div>
    </article>
  );
}

function makePolyline(values: number[], maxValue: number) {
  const width = 700;
  const height = 208;
  const left = 34;
  const top = 18;
  const chartWidth = width - left - 18;
  const chartHeight = height - top - 34;

  return values
    .map((value, index) => {
      const x =
        left +
        (index / Math.max(values.length - 1, 1)) * chartWidth;
      const y = top + chartHeight - (value / Math.max(maxValue, 1)) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function KeywordDashboard({
  onReset,
  result,
}: KeywordDashboardProps) {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const data = buildKeywordDashboardData(result);
  const realtimeNoteText = readReadableStructuredText(result);

  function handleExportPdf() {
    const previousTitle = document.title;
    const exportedAt = new Date().toISOString().slice(0, 10);

    document.title = `MoomIn_김OO_분석결과_${exportedAt}`;
    try {
      window.print();
    } finally {
      document.title = previousTitle;
    }
  }

  if (!data) {
    return (
      <section className={styles.centered} aria-live="polite">
        <div className={styles.resultWrap}>
          <div className={styles.eyebrow}>분석 완료</div>
          <h1>기록 분석이 끝났습니다</h1>
          <p className={styles.sub}>
            응답에서 client_utterance_keywords 값을 찾지 못해 원본 결과를
            표시합니다.
          </p>
          <pre className={styles.resultJson}>
            {JSON.stringify(result, null, 2)}
          </pre>
          {realtimeNoteText && <RealtimeNoteCard text={realtimeNoteText} />}
          <button
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={onReset}
            type="button"
          >
            다른 문서 분석
          </button>
        </div>
      </section>
    );
  }

  const visibleKeywords = data.summaries.slice(0, 9);
  const visibleTrends = data.trends.slice(0, 5);
  const maximumCount = Math.max(...visibleKeywords.map((item) => item.count), 1);
  const trendMaximum = Math.max(
    ...visibleTrends.flatMap((trend) => trend.values),
    1,
  );
  const chartTicks = [trendMaximum, trendMaximum * 0.5, 0];
  const hasHistoricalSessions = data.groups.some((group) =>
    group.includes("회기"),
  );
  const selectedSummary = data.summaries.find(
    (summary) => summary.keyword === selectedKeyword,
  );
  const selectedTrend = data.trends.find(
    (trend) => trend.keyword === selectedKeyword,
  );
  const sidebarGroups = data.groups.slice(-5);
  const sidebarValues = selectedTrend
    ? selectedTrend.values.slice(-5)
    : sidebarGroups.map((_, index) =>
        index === sidebarGroups.length - 1 ? (selectedSummary?.count ?? 0) : 0,
      );
  const sidebarMaximum = Math.max(...sidebarValues, 1);
  const matchingUtterances = selectedKeyword
    ? data.utterances
        .filter((utterance) =>
          includesKeyword(utterance.text, selectedKeyword),
        )
        .slice(0, Math.max(0, Math.floor(selectedSummary?.count ?? 0)))
    : [];

  return (
    <section className={styles.resultsPage} aria-live="polite">
      <header className={styles.resultsHeader}>
        <div>
          <div className={styles.resultsClient}>
            <span className={styles.resultsClientMark} aria-hidden="true" />
            <strong>김○○</strong>
          </div>
          <p>
            키워드 {data.uniqueKeywords}개 · 총 {data.totalMentions}회 감지
          </p>
        </div>
        <div className={styles.resultsHeaderActions}>
          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={onReset}
            type="button"
          >
            다른 문서 분석
          </button>
          <button
            className={`${styles.button} ${styles.primaryButton} ${styles.exportPdfButton}`}
            onClick={handleExportPdf}
            type="button"
          >
            PDF로 추출
          </button>
        </div>
      </header>

      <div
        className={`${styles.resultsContent} ${selectedKeyword ? styles.resultsContentWithSidebar : ""}`}
      >
        <article className={styles.resultCard}>
          <div className={styles.cardHeading}>
            <div>
              <div className={styles.eyebrow}>키워드 집계</div>
              <h2>내담자의 주요 키워드</h2>
              <p>
                client_utterance_keywords에 포함된 키워드의 등장 횟수입니다.
              </p>
            </div>
            <span>막대 길이 = 등장 횟수</span>
          </div>

          <div className={styles.keywordBars}>
            {visibleKeywords.map((item, index) => (
              <button
                aria-pressed={selectedKeyword === item.keyword}
                className={`${styles.keywordRow} ${selectedKeyword === item.keyword ? styles.keywordRowSelected : ""}`}
                key={item.keyword}
                onClick={() => setSelectedKeyword(item.keyword)}
                type="button"
              >
                <strong>{item.keyword}</strong>
                <div className={styles.keywordTrack}>
                  <span
                    className={index === 0 ? styles.keywordBarPrimary : ""}
                    style={{ width: `${(item.count / maximumCount) * 100}%` }}
                  />
                </div>
                <b>{item.count}회</b>
                <span>{item.percentage.toFixed(1)}%</span>
              </button>
            ))}
          </div>

          <p className={styles.cardNote}>
            같은 키워드가 여러 발화에 나타나면 모두 합산합니다. 비율은 전체
            키워드 등장 횟수를 기준으로 계산합니다.
          </p>
        </article>

        <article className={styles.resultCard}>
          <div className={styles.cardHeading}>
            <div>
              <div className={styles.eyebrow}>변화 추이</div>
              <h2>발화를 지나며 어떻게 변했나</h2>
              <p>
                {data.usesMockHistory
                  ? "1~5회기 목데이터와 현재 분석 결과"
                  : hasHistoricalSessions
                  ? `${data.groups.length}개 회기의 실제 등장 횟수`
                  : "분석 전 0에서 현재 키워드 집계 결과까지의 변화"}
              </p>
            </div>
            <div className={styles.trendLegend} aria-label="그래프 범례">
              {visibleTrends.map((trend, index) => (
                <span key={trend.keyword}>
                  <i style={{ background: trendColor(index) }} />
                  {trend.keyword}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.chartWrap}>
            <svg
              aria-label="키워드 등장 횟수 변화 추이"
              className={styles.trendChart}
              role="img"
              viewBox="0 0 700 208"
            >
              {chartTicks.map((tick, index) => {
                const y = 18 + index * 78;
                return (
                  <g key={`${tick}-${index}`}>
                    <line x1="34" x2="682" y1={y} y2={y} />
                    <text x="0" y={y + 4}>
                      {Math.round(tick)}
                    </text>
                  </g>
                );
              })}
              {visibleTrends.map((trend, trendIndex) => {
                const points = makePolyline(trend.values, trendMaximum);
                return (
                  <g key={trend.keyword}>
                    <polyline
                      fill="none"
                      points={points}
                      stroke={trendColor(trendIndex)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    />
                    {points.split(" ").map((point, pointIndex) => {
                      const [cx, cy] = point.split(",");
                      return (
                        <circle
                          aria-label={`${trend.keyword} ${data.groups[pointIndex]} ${trend.values[pointIndex]}회`}
                          cx={cx}
                          cy={cy}
                          fill="#fff"
                          key={`${trend.keyword}-${pointIndex}`}
                          r="4"
                          stroke={trendColor(trendIndex)}
                          strokeWidth="2.5"
                        />
                      );
                    })}
                  </g>
                );
              })}
              {data.groups.map((group, index) => {
                const x =
                  34 +
                  (index / Math.max(data.groups.length - 1, 1)) * 648;
                return (
                  <text
                    className={styles.chartXAxis}
                    key={group}
                    textAnchor="middle"
                    x={x}
                    y="202"
                  >
                    {group}
                  </text>
                );
              })}
            </svg>
          </div>

          <p className={styles.cardNote}>
            {data.usesMockHistory
              ? "1~5회기는 화면 검증용 목데이터이며, ‘현재 분석’은 이번 API 응답의 실제 키워드 집계값입니다. 실제 누적 회기 데이터가 제공되면 목데이터 대신 해당 결과를 사용합니다."
              : "세로축은 회기별 실제 등장 횟수입니다."}
          </p>
        </article>

        {realtimeNoteText && <RealtimeNoteCard text={realtimeNoteText} />}

        <details className={styles.rawResult}>
          <summary>분석 결과 JSON 보기</summary>
          <pre className={styles.resultJson}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>

      {selectedKeyword && selectedSummary && (
        <aside
          aria-label={`${selectedKeyword} 키워드 상세`}
          className={styles.keywordSidebar}
        >
          <header className={styles.keywordSidebarHeader}>
            <div>
              <h2>{selectedKeyword}</h2>
              <p>현재 분석 · 내담자 발화</p>
            </div>
            <button
              className={styles.keywordSidebarClose}
              onClick={() => setSelectedKeyword(null)}
              type="button"
            >
              닫기
            </button>
          </header>

          <div className={styles.keywordSidebarSummary}>
            <strong>{selectedSummary.count}회</strong>
            <span>{selectedSummary.percentage.toFixed(1)}%</span>
            <small>전체 키워드 등장 횟수 중</small>
          </div>

          <section className={styles.keywordSidebarSection}>
            <div className={styles.keywordSidebarSectionHead}>
              <h3>최근 5회기 발화 횟수</h3>
            </div>
            <div
              aria-label={`${selectedKeyword} 최근 5회기 발화 횟수 변화`}
              className={styles.sidebarBars}
              role="img"
            >
              {sidebarGroups.map((group, index) => {
                const value = sidebarValues[index] ?? 0;
                return (
                  <div className={styles.sidebarBarItem} key={group}>
                    <span>{value}회</span>
                    <div className={styles.sidebarBarTrack}>
                      <i
                        style={{
                          height: `${Math.max(
                            (value / sidebarMaximum) * 100,
                            value > 0 ? 7 : 2,
                          )}%`,
                        }}
                      />
                    </div>
                    <small>{group}</small>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.keywordSidebarSection}>
            <div className={styles.keywordSidebarSectionHead}>
              <h3>실제 발화 원문</h3>
              <span>{matchingUtterances.length}개</span>
            </div>
            <div className={styles.keywordUtterances}>
              {matchingUtterances.length > 0 ? (
                matchingUtterances.map((utterance, index) => (
                  <article key={`${utterance.turnIndex ?? index}-${index}`}>
                    <div>
                      <span>
                        {utterance.timestamp ??
                          (utterance.page ? `${utterance.page}페이지` : "원문")}
                      </span>
                      {utterance.turnIndex !== undefined && (
                        <small>{utterance.turnIndex}번째 발화</small>
                      )}
                    </div>
                    <p>“{utterance.text}”</p>
                  </article>
                ))
              ) : (
                <p className={styles.keywordUtteranceEmpty}>
                  이 키워드가 포함된 발화 원문을 찾지 못했습니다.
                </p>
              )}
            </div>
          </section>
        </aside>
      )}
    </section>
  );
}
