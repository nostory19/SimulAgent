# Feature Specification: SimulAgent Platform

**Feature Branch**: `001-simulagent-platform`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User description: "SimulAgent —— 基于多智能体协同的实时同声传译助手 (PRD for a multi-agent real-time simultaneous interpretation assistant)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Audio Capture & Transcription (Priority: P1)

A user is watching a foreign-language video (e.g., YouTube, TED talk, online course) or attending an international meeting (e.g., Zoom, Google Meet). They launch SimulAgent, which automatically detects and captures the playing audio from their system. The system transcribes the spoken content into text in real time, displaying the recognized text incrementally as the speaker continues.

**Why this priority**: Audio capture and speech recognition form the foundation of the entire system. Without accurate transcription, no downstream translation or summarization is possible. This is the minimum deliverable that provides standalone value — users can read real-time transcripts even without translation.

**Independent Test**: Can be fully tested by playing any English audio source (video, meeting, recording) and verifying that SimulAgent displays incrementally updating transcribed text with latency under 3 seconds.

**Acceptance Scenarios**:

1. **Given** SimulAgent is running and system audio is playing English speech, **When** the user starts a capture session, **Then** transcribed English text appears on screen within 3 seconds of speech, updating incrementally as more speech is recognized.
2. **Given** a capture session is active, **When** the audio source contains silence or non-speech sounds, **Then** the system does not produce hallucinated or random transcription output.
3. **Given** a capture session is active and the audio source switches (e.g., from a video to a meeting app), **When** the new audio plays, **Then** the system continues transcribing without requiring manual reconfiguration.
4. **Given** the user is in a noisy environment with background sounds, **When** speech is present in the captured audio, **Then** the system still produces recognizable transcription, ignoring non-speech background noise.

---

### User Story 2 - Real-Time Translation & Subtitle Display (Priority: P1)

A user who does not understand the source language (e.g., English) wants to follow along with content in their native language (e.g., Chinese). As the system transcribes speech, it translates the text in real time and displays it as scrolling subtitles. The user can choose between Chinese-only or bilingual (source + translation) subtitle display.

**Why this priority**: Translation is the core value proposition of SimulAgent. Together with audio capture (User Story 1), these two stories constitute the MVP that delivers the primary user need: understanding foreign-language content in real time.

**Independent Test**: Can be tested by playing English audio, verifying that Chinese subtitles appear with contextually accurate translation within the latency target, and confirming the subtitle display modes (Chinese-only, bilingual) work correctly.

**Acceptance Scenarios**:

1. **Given** audio capture and transcription are active for English speech, **When** transcribed text is produced, **Then** Chinese translation appears as subtitles within 2 seconds of the original transcription.
2. **Given** the subtitle display is showing translations, **When** the user switches between Chinese-only and bilingual mode, **Then** the display updates immediately to reflect the selected mode.
3. **Given** a long sentence is being spoken, **When** partial transcription is available, **Then** the system translates and displays partial results without waiting for the complete sentence.
4. **Given** the subtitle history has accumulated multiple entries, **When** the user scrolls back, **Then** they can view previously displayed subtitles.

---

### User Story 3 - Context-Aware Dynamic Revision (Priority: P2)

While watching a technical presentation, the speaker first says "graph model" which is translated as "图模型". Moments later, the speaker says "graph foundation model", revealing the full technical term. The system automatically detects that the earlier translation was incomplete and revises it to "图基础模型", highlighting the change so the user notices the correction.

**Why this priority**: Dynamic revision is a key differentiator from conventional translation tools. It addresses the fundamental challenge of simultaneous interpretation where later context clarifies earlier ambiguity. This feature significantly improves translation quality for technical and domain-specific content.

**Independent Test**: Can be tested by playing audio with ambiguous introductory phrases that are later clarified (e.g., acronyms, compound technical terms), and verifying that earlier subtitle entries are updated with highlighted changes when new context arrives.

**Acceptance Scenarios**:

1. **Given** a subtitle entry was produced based on partial context, **When** subsequent speech provides clarifying context that changes the optimal translation, **Then** the earlier subtitle is automatically updated and visually highlighted to indicate a revision occurred.
2. **Given** a revision has been applied to a subtitle, **When** the user views the subtitle history, **Then** both the original and revised translations are visible, with the revision clearly marked.
3. **Given** a subtitle entry that is unambiguous and confirmed by later context, **When** no revision is needed, **Then** the subtitle remains stable and is not unnecessarily modified.

---

### User Story 4 - Terminology Enhancement via Reference Materials (Priority: P3)

A researcher attending an academic conference uploads the conference program, abstract booklet, and relevant papers (PDF, PPT, Word) before the session begins. SimulAgent extracts domain-specific terminology from these materials and builds a terminology knowledge base. During the live translation, the system prioritizes the standard Chinese translations of these terms — for example, translating a specific medical term consistently with the convention used in the uploaded materials rather than a generic translation.

**Why this priority**: Terminology enhancement dramatically improves translation quality for specialized domains, which is a core need for researchers and professionals. However, it depends on the basic translation pipeline (P1, P2) being functional first and adds value primarily for users with prepared materials.

**Independent Test**: Can be tested by uploading a domain-specific document (e.g., a machine learning paper with terms like "attention mechanism", "backpropagation"), then playing audio containing those terms, and verifying that the translations match the standard Chinese terminology from the document rather than literal translations.

**Acceptance Scenarios**:

1. **Given** the user has uploaded one or more reference documents, **When** the system processes them, **Then** a terminology knowledge base is built containing domain-specific terms and their standard translations.
2. **Given** a terminology knowledge base is active, **When** a recognized term appears in transcription, **Then** the translation uses the knowledge base entry rather than a generic translation.
3. **Given** the user has not uploaded any reference materials, **When** translation proceeds, **Then** the system uses its default translation capabilities without degradation.

---

### User Story 5 - Post-Session AI Summary (Priority: P3)

A user finishes watching a 45-minute conference keynote with SimulAgent active. After the session ends, they request a summary. The system generates a structured summary including: a concise abstract of the talk, key viewpoints discussed, a glossary of important terms that appeared, and actionable items or takeaways mentioned by the speaker.

**Why this priority**: Summarization adds significant value for knowledge retention and sharing, but it is not required for the core real-time translation experience. It can be developed and delivered after the real-time pipeline is stable.

**Independent Test**: Can be tested by running a complete transcription + translation session with known content, triggering the summary generation, and verifying that the output contains all required sections (abstract, key points, terms, action items) with factually correct content derived from the session transcript.

**Acceptance Scenarios**:

1. **Given** a capture session with at least 5 minutes of transcribed content has ended, **When** the user requests a summary, **Then** the system generates a structured summary with abstract, key viewpoints, term glossary, and action items.
2. **Given** a summary has been generated, **When** the user reviews it, **Then** all extracted information is factually grounded in the session transcript with no hallucinated content.
3. **Given** a very short session (under 2 minutes), **When** the user requests a summary, **Then** the system either provides a proportionally brief summary or indicates insufficient content for meaningful summarization.

---

### Edge Cases

- What happens when the system captures audio in a language that does not match the user's selected source language? (The ASR should either auto-detect or gracefully handle the mismatch, potentially alerting the user.)
- How does the system handle overlapping speech from multiple speakers (e.g., panel discussions)? (The system should transcribe the dominant speaker and may indicate speaker changes when possible.)
- What happens when the user's computer enters sleep mode or the audio source is interrupted mid-session? (The session should pause gracefully and offer to resume when audio returns.)
- How does the system behave when internet connectivity is lost (if cloud services are in use)? (The system should cache locally and resume when connectivity is restored.)
- What happens when the uploaded reference document is in an unsupported format or is corrupted? (The system should report the specific file that could not be processed and continue with default translation.)
- How does the system handle extremely long sessions (4+ hours) in terms of memory and subtitle history? (The system should manage memory efficiently, potentially paginating or archiving older subtitle history.)

## Requirements *(mandatory)*

### Functional Requirements

**Audio Capture**
- **FR-001**: System MUST capture system audio output (speakers/headphones) from the user's device.
- **FR-002**: System MUST support audio capture on Windows and macOS platforms.
- **FR-003**: System MUST automatically detect and capture the active audio source without requiring manual device selection by the user.

**Speech Recognition (ASR)**
- **FR-004**: System MUST transcribe captured audio into text incrementally, displaying partial results as they become available.
- **FR-005**: System MUST support speech recognition for English, Chinese, Japanese, and Korean source languages.
- **FR-006**: System MUST continue transcribing during periods of continuous speech without gaps or dropped segments.

**Real-Time Translation**
- **FR-007**: System MUST translate transcribed text into Chinese in real time with streaming output.
- **FR-008**: System MUST use surrounding context (preceding sentences and topic) to inform translation choices, not translating each sentence in isolation.
- **FR-009**: Users MUST be able to switch between Chinese-only and bilingual (source + Chinese) subtitle display modes.

**Dynamic Revision**
- **FR-010**: System MUST detect when later context changes the optimal translation of earlier content and update the displayed subtitles accordingly.
- **FR-011**: System MUST visually highlight revised subtitles so users can identify what changed.

**Terminology Enhancement**
- **FR-012**: Users MUST be able to upload reference documents (PDF, PPT, Word formats) to build a session-specific terminology knowledge base.
- **FR-013**: System MUST extract domain-specific terms from uploaded documents and prioritize their standard translations during live translation.

**Subtitle Display**
- **FR-014**: System MUST display subtitles as a floating overlay window that stays on top of other applications.
- **FR-015**: System MUST support scrolling through subtitle history during an active session.
- **FR-016**: System MUST allow users to adjust subtitle display settings (font size, position, opacity).

**Session Summary**
- **FR-017**: System MUST generate a post-session summary containing: abstract, key viewpoints, term glossary, and action items upon user request.
- **FR-018**: System MUST base all summary content on the actual session transcript without introducing fabricated information.

### Key Entities

- **Capture Session**: Represents a continuous period of audio capture and translation. Contains start time, end time, source language, and all associated transcription and translation records.
- **Transcription Segment**: A timed segment of recognized speech text. Contains the original language text, timestamp, and confidence score.
- **Translation Entry**: A translated subtitle entry linked to a transcription segment. Contains both the current translation and any revision history. Tracks whether it has been revised.
- **Terminology Entry**: A domain-specific term extracted from uploaded reference materials. Contains the source term, its standard translation, and the source document reference.
- **Session Summary**: A structured post-session output containing abstract, key viewpoints, term glossary, and action items. Linked to the capture session it summarizes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see the first subtitle appear on screen within 5 seconds of launching a capture session with active audio.
- **SC-002**: Translation latency (time from original speech to translated subtitle display) does not exceed 3 seconds under normal operating conditions.
- **SC-003**: The system maintains stable operation during continuous sessions of at least 4 hours without crashes, memory exhaustion, or progressive latency degradation.
- **SC-004**: Dynamic revision improves translation accuracy for ambiguous technical terms by at least 30% compared to translation without revision (as measured by human evaluation on test passages containing initially ambiguous terms).
- **SC-005**: When a terminology knowledge base is active, domain-specific terms are translated with at least 90% consistency with the reference materials' standard translations.
- **SC-006**: Session summaries contain at least 80% of the key points that a human listener would identify from the same session, with no fabricated claims.
- **SC-007**: First-time users can successfully start a capture session and view translated subtitles within 1 minute of opening the application, without reading documentation.
- **SC-008**: Users report a subjective comprehension improvement — they can answer content questions about a foreign-language video with at least 70% accuracy when using SimulAgent, compared to baseline without assistance.

## Assumptions

- The user's device has sufficient processing capability for real-time audio capture and local ASR processing, or has stable internet connectivity for cloud-based processing.
- Source audio is primarily single-speaker content (presentations, lectures, meetings with orderly turn-taking). Multi-speaker overlapping conversations are not a primary target for the initial release.
- The default translation target language is Chinese. Support for additional target languages (French, German, Spanish) is planned for future releases.
- Users have a display with sufficient resolution to render subtitle overlay text legibly (minimum 1366x768).
- Reference documents uploaded for terminology enhancement are in standard formats (PDF, PPTX, DOCX) and are not password-protected or scanned images without OCR text.
- The floating subtitle window does not interfere with DRM-protected content playback, as it operates as an independent system-level overlay.
- Session summaries are generated upon explicit user request (not automatically), and the user can choose whether to save or discard them.
- Linux support for audio capture is planned but may have platform-specific limitations in the initial release.
- The system is designed for informational and educational use cases. It is not intended for certified legal or medical interpretation where certified human interpreters are required.
