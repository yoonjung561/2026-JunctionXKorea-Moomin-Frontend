import { buildKeywordDashboardData } from "./keyword-analysis";
import styles from "./page.module.css";

function trendColor(index: number) {
  return `hsl(${(index * 47 + 210) % 360} 58% 54%)`;
}

type KeywordDashboardProps = {
  onReset: () => void;
  result: unknown;
};

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
  const data = buildKeywordDashboardData(result);

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
  const maximumCount = Math.max(...visibleKeywords.map((item) => item.count), 1);
  const trendMaximum = Math.max(
    ...data.trends.flatMap((trend) => trend.values),
    1,
  );
  const chartTicks = [trendMaximum, trendMaximum * 0.5, 0];
  const hasHistoricalSessions = data.groups.some((group) =>
    group.includes("회기"),
  );

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
        <button
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={onReset}
          type="button"
        >
          다른 문서 분석
        </button>
      </header>

      <div className={styles.resultsContent}>
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
              <div className={styles.keywordRow} key={item.keyword}>
                <strong>{item.keyword}</strong>
                <div className={styles.keywordTrack}>
                  <span
                    className={index === 0 ? styles.keywordBarPrimary : ""}
                    style={{ width: `${(item.count / maximumCount) * 100}%` }}
                  />
                </div>
                <b>{item.count}회</b>
                <span>{item.percentage.toFixed(1)}%</span>
              </div>
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
                {hasHistoricalSessions
                  ? `${data.groups.length}개 회기의 실제 등장 횟수`
                  : "분석 전 0에서 현재 키워드 집계 결과까지의 변화"}
              </p>
            </div>
            <div className={styles.trendLegend} aria-label="그래프 범례">
              {data.trends.map((trend, index) => (
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
              {data.trends.map((trend, trendIndex) => {
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
            세로축은 실제 등장 횟수입니다. 누적 회기 데이터가 없는 현재
            단계에서는 모든 키워드를 0에서 시작해 이번 분석의 집계값과
            연결합니다. 임의의 과거 데이터는 생성하지 않습니다.
          </p>
        </article>

        <details className={styles.rawResult}>
          <summary>분석 결과 JSON 보기</summary>
          <pre className={styles.resultJson}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    </section>
  );
}
