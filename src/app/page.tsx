"use client";

import type {
  ChangeEvent,
  DragEvent,
  FormEvent,
} from "react";
import { useRef, useState } from "react";
import KeywordDashboard from "./KeywordDashboard";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SESSION_ID = "9beaeab4-d75b-42bc-9f02-0b3619dd9ba8";

const clients = [
  { name: "김○○", meta: "9회기 진행 · 최근 05-06", active: true },
  { name: "박○○", meta: "4회기 진행 · 최근 04-30" },
  { name: "이○○", meta: "12회기 종결 · 04-22" },
  { name: "정○○", meta: "2회기 진행 · 최근 05-04" },
];

type View = "upload" | "analyzing" | "complete";

type SpeakerOption = {
  label: string;
  utterances: string[];
  utteranceCount: number;
};

type SpeakerConfirmation = {
  selectedLabel: string;
  sessionNumber?: string;
  speakers: SpeakerOption[];
};

type AnalysisApiResponse = {
  sessionId?: string;
  status?: string;
  clientSpeakerLabel?: string;
  counselorSpeakerLabel?: string;
  speakers?: unknown;
  analysisResult?: unknown;
};

type UtteranceRecord = {
  speakerLabel: string;
  utteranceText: string;
  dedupeKey: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonText(value: unknown): unknown {
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function normalizeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLabel(value: unknown): string | null {
  return normalizeText(value);
}

function normalizeSpeakerLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((speaker): speaker is string => typeof speaker === "string")
    .map((speaker) => speaker.trim())
    .filter(Boolean);
}

function readUtteranceRecords(
  value: unknown,
  fallbackSpeakerLabel?: string | null,
): UtteranceRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((utterance) => {
    if (!isRecord(utterance)) return [];

    const clientSpeakerLabel =
      normalizeLabel(
        utterance.speaker_label ?? utterance.speakerLabel ?? utterance.label,
      ) ?? normalizeLabel(fallbackSpeakerLabel);
    const utteranceText = normalizeText(
      utterance.utterance_text ?? utterance.utteranceText ?? utterance.text,
    );

    if (!clientSpeakerLabel || !utteranceText) return [];

    const utteranceId = normalizeText(
      utterance.utterance_id ?? utterance.utteranceId ?? utterance.id,
    );

    return [
      {
        speakerLabel: clientSpeakerLabel,
        utteranceText,
        dedupeKey: utteranceId
          ? `${clientSpeakerLabel}::${utteranceId}`
          : `${clientSpeakerLabel}::${utteranceText}`,
      },
    ];
  });
}

function readAnalysisResultUtterances(
  analysisResult: unknown,
  clientSpeakerLabel?: string | null,
  counselorSpeakerLabel?: string | null,
): Map<string, Map<string, string>> {
  const parsedAnalysisResult = parseJsonText(analysisResult) ?? analysisResult;
  if (!isRecord(parsedAnalysisResult)) return new Map();

  const utterancesBySpeaker = new Map<string, Map<string, string>>();

  const addUtterance = (record: UtteranceRecord) => {
    const previous =
      utterancesBySpeaker.get(record.speakerLabel) ?? new Map<string, string>();
    previous.set(record.dedupeKey, record.utteranceText);
    utterancesBySpeaker.set(record.speakerLabel, previous);
  };

  const sources = [
    {
      utterances:
        parsedAnalysisResult.client_utterances ??
        parsedAnalysisResult.clientUtterances,
      fallbackSpeakerLabel: clientSpeakerLabel,
    },
    {
      utterances:
        parsedAnalysisResult.counselor_utterances ??
        parsedAnalysisResult.counselorUtterances,
      fallbackSpeakerLabel: counselorSpeakerLabel,
    },
  ];

  sources.forEach(({ utterances, fallbackSpeakerLabel }) => {
    readUtteranceRecords(utterances, fallbackSpeakerLabel).forEach(addUtterance);
  });

  return utterancesBySpeaker;
}

function findSpeakerConfirmation(
  responseBody: unknown,
): SpeakerConfirmation | null {
  if (!isRecord(responseBody)) return null;

  const response = responseBody as AnalysisApiResponse;
  const clientSpeakerLabel =
    typeof response.clientSpeakerLabel === "string" &&
    response.clientSpeakerLabel.trim()
      ? response.clientSpeakerLabel.trim()
      : null;

  if (!clientSpeakerLabel) return null;

  const utterancesBySpeaker = readAnalysisResultUtterances(
    response.analysisResult,
    clientSpeakerLabel,
    response.counselorSpeakerLabel,
  );
  const speakerLabels = new Set<string>([
    ...normalizeSpeakerLabels(response.speakers),
    clientSpeakerLabel,
  ]);

  if (
    typeof response.counselorSpeakerLabel === "string" &&
    response.counselorSpeakerLabel.trim()
  ) {
    speakerLabels.add(response.counselorSpeakerLabel.trim());
  }

  const speakers = [...speakerLabels]
    .map((label) => ({
      label,
      utterances: [...(utterancesBySpeaker.get(label)?.values() ?? [])],
      utteranceCount: utterancesBySpeaker.get(label)?.size ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko", { numeric: true }));

  return {
    selectedLabel: clientSpeakerLabel,
    sessionNumber:
      typeof response.sessionId === "string" && response.sessionId.trim()
        ? response.sessionId.trim()
        : undefined,
    speakers,
  };
}

function readDocumentType(value: unknown, depth = 0): string | null {
  const parsedValue = parseJsonText(value) ?? value;
  if (depth > 8 || !isRecord(parsedValue)) return null;

  const directType = normalizeText(
    parsedValue.document_type ?? parsedValue.documentType,
  );
  if (directType) return directType.toLowerCase();

  const prioritizedValues = [
    parsedValue.analysisResult,
    parsedValue.realtimeNote,
    parsedValue.speakerSelection,
    ...Object.values(parsedValue),
  ];

  for (const nestedValue of prioritizedValues) {
    if (isRecord(nestedValue) || typeof nestedValue === "string") {
      const nestedType = readDocumentType(nestedValue, depth + 1);
      if (nestedType) return nestedType;
    }
  }

  return null;
}

function isRealtimeNoteDocument(documentType: string | null) {
  return documentType === "realtime_note" || documentType === "realtme_note";
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileKind(file: File) {
  const extension = file.name.split(".").pop()?.toUpperCase();
  if (
    extension === "JPG" ||
    extension === "JPEG" ||
    extension === "PNG" ||
    extension === "HEIC" ||
    extension === "HEIF"
  ) {
    return "손글씨";
  }
  if (extension === "PDF") return "문서 · 분석 준비 완료";
  return extension ? `${extension} 문서` : "문서";
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildApiUrl(path: string) {
  const baseUrl = API_URL?.replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (baseUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${baseUrl}${normalizedPath.slice(4)}`;
  }

  return `${baseUrl}${normalizedPath}`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [view, setView] = useState<View>("upload");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [speakerConfirmation, setSpeakerConfirmation] =
    useState<SpeakerConfirmation | null>(null);
  const [selectedSpeakerLabel, setSelectedSpeakerLabel] = useState<string | null>(
    null,
  );
  const [analysisSessionId, setAnalysisSessionId] = useState(SESSION_ID);
  const [isConfirmingSpeaker, setIsConfirmingSpeaker] = useState(false);
  const [latestKeywordAnalysis, setLatestKeywordAnalysis] =
    useState<unknown>(null);

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setError(null);
    setSpeakerConfirmation(null);
    setSelectedSpeakerLabel(null);
    setAnalysisSessionId(SESSION_ID);
    setIsConfirmingSpeaker(false);
    setView("upload");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || !API_URL) {
      setError(
        !API_URL
          ? "API URL이 설정되지 않았습니다."
          : "분석할 문서를 선택해 주세요.",
      );
      return;
    }

    setView("analyzing");
    setResult(null);
    setError(null);
    setSpeakerConfirmation(null);
    setSelectedSpeakerLabel(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        buildApiUrl(`/api/sessions/${SESSION_ID}/analysis`),
        { method: "POST", body: formData },
      );
      const responseBody = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${JSON.stringify(responseBody)}`,
        );
      }

      console.log(responseBody);
      const documentType = readDocumentType(responseBody);
      const nextResult =
        isRealtimeNoteDocument(documentType) && latestKeywordAnalysis
          ? {
              analysis: latestKeywordAnalysis,
              realtimeNote: responseBody,
            }
          : responseBody;

      setResult(nextResult);
      if (documentType === "transcript") {
        setLatestKeywordAnalysis(responseBody);
      }
      if (
        isRecord(responseBody) &&
        typeof responseBody.sessionId === "string" &&
        responseBody.sessionId.trim()
      ) {
        setAnalysisSessionId(responseBody.sessionId.trim());
      }
      const nextSpeakerConfirmation = isRealtimeNoteDocument(documentType)
        ? null
        : findSpeakerConfirmation(responseBody);

      if (isRealtimeNoteDocument(documentType)) {
        setView("complete");
      } else if (nextSpeakerConfirmation) {
        setSpeakerConfirmation(nextSpeakerConfirmation);
        setSelectedSpeakerLabel(nextSpeakerConfirmation.selectedLabel);
      } else {
        console.warn(
          "분석 결과에서 clientSpeakerLabel을 찾지 못했습니다.",
          responseBody,
        );
        setView("complete");
      }
    } catch (requestError) {
      console.error("문서 분석 요청 오류:", requestError);
      setError("분석 요청에 실패했습니다.");
      setView("upload");
    }
  }

  async function handleConfirmSpeaker() {
    if (!selectedSpeakerLabel || !API_URL || isConfirmingSpeaker) return;

    setIsConfirmingSpeaker(true);

    try {
      const response = await fetch(
        buildApiUrl(
          `/api/sessions/${analysisSessionId}/speaker-selection`,
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientSpeakerLabel: selectedSpeakerLabel }),
        },
      );
      const responseBody = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${JSON.stringify(responseBody)}`,
        );
      }

      console.log("확인된 내담자 발화자:", selectedSpeakerLabel);
      console.log("발화자 선택 응답:", responseBody);
      const completedTranscriptAnalysis = {
        analysis: result,
        speakerSelection: responseBody,
      };
      setResult(completedTranscriptAnalysis);
      setLatestKeywordAnalysis(completedTranscriptAnalysis);
      setSpeakerConfirmation(null);
      setSelectedSpeakerLabel(null);
      setView("complete");
    } catch (requestError) {
      console.error("발화자 선택 요청 오류:", requestError);
    } finally {
      setIsConfirmingSpeaker(false);
    }
  }

  return (
    <div
      className={`${styles.app} ${view === "complete" ? styles.appResults : ""}`}
    >
      <aside className={styles.side}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandName}>MoomIn</span>
        </div>
        <div className={styles.sideLabel}>담당 내담자 12명</div>
        <nav className={styles.clients} aria-label="담당 내담자">
          {clients.map((client) => (
            <button
              className={styles.client}
              aria-current={client.active ? "true" : undefined}
              key={client.name}
              type="button"
            >
              <span className={styles.clientName}>{client.name}</span>
              <span className={styles.clientMeta}>{client.meta}</span>
            </button>
          ))}
        </nav>
        <div className={styles.sideFoot}>
          모든 기록은 기관 서버에만 저장됩니다
        </div>
      </aside>

      <main className={styles.main}>
        {view === "upload" && (
          <form className={styles.pane} onSubmit={handleSubmit}>
            <header>
              <div className={styles.eyebrow}>문서 업로드</div>
              <h1>김○○ 님의 기록 올리기</h1>
              <p className={styles.sub}>
                모아둔 기록을 한 번에 올려도 됩니다. 회기 번호와 순서는 문서
                안의 상담 일시를 읽어 자동으로 정합니다.
              </p>
            </header>

            <div
              className={`${styles.drop} ${isDragging ? styles.dragging : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className={styles.dropIcon} aria-hidden="true">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                  <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
                </svg>
              </div>
              <div className={styles.dropCopy}>
                <strong>파일을 여기에 끌어다 놓으세요</strong>
                <div className={styles.chips}>
                  <span>상담 전사문 PDF · HWP · TXT</span>
                  <span>손글씨 상담일지 JPG · PNG</span>
                  <span>타이핑 메모</span>
                  <span>여러 회기 묶음 스캔</span>
                </div>
              </div>
              <label
                className={`${styles.button} ${styles.secondaryButton}`}
                htmlFor="document-upload"
              >
                파일 선택
              </label>
              <input
                ref={inputRef}
                id="document-upload"
                className={styles.fileInput}
                type="file"
                accept="application/pdf,.pdf,.hwp,.txt,image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
                onChange={handleFileChange}
              />
            </div>

            <section>
              <div className={styles.fileListHead}>
                <span>올린 파일 {file ? 1 : 0}개</span>
                <span>회기 번호는 분석 후 자동으로 붙습니다</span>
              </div>
              <div className={styles.fileList}>
                {file ? (
                  <div className={`${styles.fileRow} ${styles.flagged}`}>
                    <span className={styles.documentIcon} aria-hidden="true" />
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileKind}>{fileKind(file)}</span>
                    <span className={styles.fileSize}>
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ) : (
                  <div className={styles.emptyFileList}>
                    아직 선택한 문서가 없습니다.
                  </div>
                )}
              </div>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </section>

            <footer className={styles.paneFoot}>
              <div className={styles.note}>
                <span className={styles.info}>i</span>
                <span>
                  전사문에서는 내담자 발화만 셉니다. 상담사 발화는 제외됩니다.
                </span>
              </div>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                disabled={!file}
                type="submit"
              >
                분석 시작
              </button>
            </footer>
          </form>
        )}

        {view === "analyzing" && (
          <section className={styles.centered} aria-live="polite">
            <div className={styles.pipelineWrap}>
              <div className={styles.eyebrow}>분석 진행</div>
              <h1>기록을 읽고 있습니다</h1>
              <p className={styles.sub}>
                문서를 안전하게 전달했습니다. Agent가 내용을 읽고 분석 결과를
                정리하고 있습니다.
              </p>
              <div className={styles.pipeline}>
                <div className={styles.pipelineStep} data-state="done">
                  <span className={styles.stepDot}>✓</span>
                  <div>
                    <b>Upload</b>
                    <span>{file?.name}</span>
                  </div>
                </div>
                <div className={styles.pipelineStep} data-state="run">
                  <span className={styles.stepDot} />
                  <div>
                    <b>Analyze</b>
                    <span>문서 분석 Agent 실행 중</span>
                  </div>
                </div>
                <div className={styles.pipelineStep} data-state="idle">
                  <span className={styles.stepDot} />
                  <div>
                    <b>Result</b>
                    <span>분석 결과 정리</span>
                  </div>
                </div>
              </div>
              <div className={styles.note}>
                <span className={styles.info}>i</span>
                <span>분석이 끝날 때까지 이 창을 닫지 마세요.</span>
              </div>
            </div>
          </section>
        )}

        {view === "complete" && (
          <KeywordDashboard
            onReset={() => selectFile(null)}
            originalDocumentUrl={buildApiUrl(
              `/api/sessions/${analysisSessionId}/original-document/preview`,
            )}
            result={result}
          />
        )}

        {view === "analyzing" && speakerConfirmation && (
          <div className={styles.modalScrim}>
            <section
              aria-describedby="speaker-confirm-description"
              aria-labelledby="speaker-confirm-title"
              aria-modal="true"
              className={styles.speakerModal}
              role="dialog"
            >
              <header className={styles.modalHeader}>
                <div className={styles.modalMeta}>
                  <span className={styles.modalTag}>1차 분석 완료</span>
                  <span>
                    {[speakerConfirmation.sessionNumber, file?.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <h2 id="speaker-confirm-title">
                  발화자 {speakerConfirmation.speakers.length}명이 발견됐습니다.
                  누가 내담자인가요?
                </h2>
                <p id="speaker-confirm-description">
                  상담사의 말이 내담자의 말로 섞여 들어가면 숫자가 달라집니다.
                  내담자의 발화만 세기 위해 한 번만 확인합니다.
                </p>
              </header>

              <div className={styles.modalBody}>
                <div className={styles.speakerGrid}>
                  {speakerConfirmation.speakers.map((speaker) => {
                    const isSelected = selectedSpeakerLabel === speaker.label;

                    return (
                      <article
                        className={`${styles.speakerCard} ${isSelected ? styles.speakerCardSelected : ""}`}
                        key={speaker.label}
                      >
                        <div className={styles.speakerCardTop}>
                          <strong>{speaker.label}</strong>
                          {speaker.utteranceCount > 0 && (
                            <span>{speaker.utteranceCount}개 발화 감지</span>
                          )}
                        </div>
                        <div className={styles.utteranceList}>
                          {speaker.utterances.length > 0 ? (
                            speaker.utterances
                              .slice(0, 3)
                              .map((utterance, index) => (
                                <p key={`${utterance}-${index}`}>
                                  “{utterance}”
                                </p>
                              ))
                          ) : (
                            <p>이 발화자의 대표 발화를 확인해 주세요.</p>
                          )}
                        </div>
                        <button
                          aria-pressed={isSelected}
                          className={`${styles.speakerSelectButton} ${isSelected ? styles.speakerSelectButtonSelected : ""}`}
                          onClick={() => setSelectedSpeakerLabel(speaker.label)}
                          type="button"
                        >
                          {isSelected ? "내담자로 선택됨" : "내담자로 선택"}
                        </button>
                      </article>
                    );
                  })}
                </div>

                <div className={styles.modalHint}>
                  상담사는 질문을 많이 하고, 내담자는 자신의 경험과 감정을
                  주로 이야기합니다.
                </div>
              </div>

              <footer className={styles.modalFooter}>
                <button
                  className={styles.confirmButton}
                  disabled={!selectedSpeakerLabel || isConfirmingSpeaker}
                  onClick={handleConfirmSpeaker}
                  type="button"
                >
                  {isConfirmingSpeaker ? "분석 중" : "계속 분석"}
                </button>
              </footer>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
