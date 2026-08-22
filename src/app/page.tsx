"use client";

import type {
  ChangeEvent,
  DragEvent,
  FormEvent,
} from "react";
import { useRef, useState } from "react";
import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
};

type SpeakerConfirmation = {
  selectedLabel: string;
  sessionNumber?: string;
  speakers: SpeakerOption[];
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

function readUtterances(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((utterance) => {
      if (!isRecord(utterance)) return null;
      const text =
        utterance.utterance_text ?? utterance.utteranceText ?? utterance.text;
      return typeof text === "string" && text.trim() ? text.trim() : null;
    })
    .filter((utterance): utterance is string => Boolean(utterance));
}

function readSpeakerLabel(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;

  for (const utterance of value) {
    if (!isRecord(utterance)) continue;
    const label = utterance.speaker_label ?? utterance.speakerLabel;
    if (typeof label === "string" && label.trim()) return label.trim();
  }

  return undefined;
}

function findSpeakerConfirmation(
  responseBody: unknown,
): SpeakerConfirmation | null {
  const queue: unknown[] = [responseBody];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    const parsed = parseJsonText(current);

    if (parsed) {
      queue.unshift(parsed);
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!isRecord(current) || visited.has(current)) continue;
    visited.add(current);

    const clientLabel =
      current.client_speaker_label ?? current.clientSpeakerLabel;
    if (typeof clientLabel === "string" && clientLabel.trim()) {
      const speakers = new Map<string, string[]>();
      const addSpeaker = (label: unknown, utterances: string[] = []) => {
        if (typeof label !== "string" || !label.trim()) return;
        const normalizedLabel = label.trim();
        const previous = speakers.get(normalizedLabel) ?? [];
        speakers.set(normalizedLabel, [...previous, ...utterances]);
      };

      const availableSpeakers =
        current.availableSpeakers ?? current.available_speakers;
      if (Array.isArray(availableSpeakers)) {
        availableSpeakers.forEach((label) => addSpeaker(label));
      }

      const counselorUtteranceSource =
        current.counselor_utterances ?? current.counselorUtterances;
      const counselorLabel =
        current.counselor_speaker_label ??
        current.counselorSpeakerLabel ??
        readSpeakerLabel(counselorUtteranceSource);
      addSpeaker(counselorLabel, readUtterances(counselorUtteranceSource));
      addSpeaker(
        clientLabel,
        readUtterances(
          current.client_utterances ?? current.clientUtterances,
        ),
      );

      const allUtterances =
        current.utterances ??
        current.all_utterances ??
        current.allUtterances ??
        current.transcript;
      if (Array.isArray(allUtterances)) {
        allUtterances.forEach((utterance) => {
          if (!isRecord(utterance)) return;
          const speakerLabel =
            utterance.speaker_label ?? utterance.speakerLabel;
          addSpeaker(speakerLabel, readUtterances([utterance]));
        });
      }

      const sessionNumber =
        current.session_number ?? current.sessionNumber;

      return {
        selectedLabel: clientLabel.trim(),
        sessionNumber:
          typeof sessionNumber === "string" && sessionNumber.trim()
            ? sessionNumber.trim()
            : undefined,
        speakers: [...speakers.entries()]
          .map(([label, utterances]) => ({
            label,
            utterances: [...new Set(utterances)],
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, "ko", { numeric: true }),
          ),
      };
    }

    queue.push(...Object.values(current));
  }

  return null;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileKind(file: File) {
  const extension = file.name.split(".").pop()?.toUpperCase();
  if (extension === "JPG" || extension === "JPEG" || extension === "PNG") {
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

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setError(null);
    setSpeakerConfirmation(null);
    setSelectedSpeakerLabel(null);
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
        `${API_URL.replace(/\/$/, "")}/agent/analyze`,
        { method: "POST", body: formData },
      );
      const responseBody = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${JSON.stringify(responseBody)}`,
        );
      }

      console.log(responseBody);
      setResult(responseBody);
      const nextSpeakerConfirmation = findSpeakerConfirmation(responseBody);

      if (nextSpeakerConfirmation) {
        setSpeakerConfirmation(nextSpeakerConfirmation);
        setSelectedSpeakerLabel(nextSpeakerConfirmation.selectedLabel);
      } else {
        console.warn(
          "분석 결과에서 client_speaker_label을 찾지 못했습니다.",
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

  function handleConfirmSpeaker() {
    console.log("확인된 내담자 발화자:", selectedSpeakerLabel);
    setSpeakerConfirmation(null);
    setSelectedSpeakerLabel(null);
    setView("complete");
  }

  return (
    <div className={styles.app}>
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
                accept="application/pdf,.pdf,.hwp,.txt,image/jpeg,image/png"
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
          <section className={styles.centered} aria-live="polite">
            <div className={styles.resultWrap}>
              <div className={styles.eyebrow}>분석 완료</div>
              <h1>기록 분석이 끝났습니다</h1>
              <p className={styles.sub}>
                Backend와 문서 분석 Agent가 반환한 결과입니다.
              </p>
              <pre className={styles.resultJson}>
                {JSON.stringify(result, null, 2)}
              </pre>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={() => setView("upload")}
                type="button"
              >
                다른 문서 분석
              </button>
            </div>
          </section>
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
                          {speaker.utterances.length > 0 && (
                            <span>{speaker.utterances.length}개 발화 감지</span>
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
                  disabled={!selectedSpeakerLabel}
                  onClick={handleConfirmSpeaker}
                  type="button"
                >
                  계속 분석
                </button>
              </footer>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
