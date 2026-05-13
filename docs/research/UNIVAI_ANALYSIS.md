# UnivAI — Product Research Notes

> **Document status:** External product research / competitive inspiration only.  
> **Not** a project spec, roadmap, or implementation directive.  
> Do **not** implement features from this document unless the project owner explicitly requests it.

---

## Overview

UnivAI is a Korean AI-powered study platform focused on transforming study materials into AI-generated learning tools.

**Observed positioning:**

- exam-oriented learning workflow
- AI-generated study aids
- PDF-centric ingestion
- highly visual + minimalistic UX
- strong emphasis on speed and convenience

**Primary observed market:**

- Korean university students
- likely Korea-first product strategy with partial global expansion

**Observed platform support:**

- Web (univai.co.kr)
- iPhone
- iPad
- macOS (Apple Silicon support via App Store listing)

**Public branding:**

- “Powered by Gemini”
- “Backed by Google Cloud”

---

## Product Positioning

**Core message observed on landing page:**

> “Finish the exam studying you stayed up all night for in 10 minutes.”

This indicates:

- speed-focused value proposition
- exam-performance positioning
- study efficiency over deep knowledge management

**Main transformation pipeline:**

```
Study Material
    ↓
AI Processing
    ↓
Summary / Quiz / Flashcards / Mind Map / Tutor
```

---

## Confirmed Features

### File + Content Ingestion

**Observed upload options:**

- PDF upload
- YouTube video
- Image upload
- Folder creation

**Implications:**

- transcript ingestion pipeline
- OCR/image understanding support
- multi-source knowledge ingestion
- persistent workspace organization

### AI Summary

**Observed behavior:**

- AI-generated structured summaries
- clickable summary sections
- source-grounded navigation
- expandable sections/dropdowns
- comparison tables embedded in summaries

**Key UX pattern:**

clicking summary items automatically navigates the PDF viewer to the corresponding source section

**Possible implementation ideas:**

- chunk-to-page references
- source metadata mapping
- synchronized PDF navigation

**Important insight:**  
The summaries feel grounded in the original material rather than detached/generated independently.

### AI Quiz

**Observed quiz types:**

- multiple choice
- open-ended questions

**Observed UX:**

- user can submit “???” or effectively request the answer
- correct answer and explanation appear
- explanation is grounded in source material
- PDF viewer navigates to corresponding section

**Educational pattern:**

- active recall
- immediate feedback
- contextual reinforcement

**Important insight:**  
The system reduces friction between “question” and “source explanation.”

### AI Flashcards

**Observed behavior:**

- generated flashcards from uploaded materials
- flip-card interaction
- progress tracking bar
- self-grading workflow

**Observed buttons:**

- green confirmation (“I knew it”)
- red confirmation (“I didn’t know it”)

**Implications:**

- lightweight spaced repetition mechanics
- reinforcement-based study loop
- gamified progression

### AI Mind Maps

**Observed behavior:**

- hierarchical expandable nodes
- progressive disclosure UI
- clean/simple visualization
- concept relationship mapping

**Important UX decision:**  
Mind maps are NOT fully expanded initially.

Instead:

- users expand nodes progressively
- reduces overwhelm
- preserves readability

**Important insight:**  
Mind maps emphasize:

- relationships between concepts
- structural understanding
- simplification of complex material

### AI Tutor / Chat

**Observed behavior:**

- AI chat integrated directly beside source material
- screenshot/crop selection workflow
- cropped region automatically attached into chat context

**Observed interaction:**

```
select PDF region
      ↓
crop screenshot
      ↓
auto-insert into AI chat
      ↓
ask contextual question
```

**Important insight:**  
Visual references may be superior to text-only references for PDFs because PDFs are spatial and layout-oriented.

**Potential future inspiration:**  
Hybrid reference system:

- text references for editable notes
- screenshot/visual references for PDFs/images

---

## Workspace + Layout Observations

**Observed overall layout:**

- PDF viewer on left
- AI/study tools on right
- synchronized contextual workspace

**Key design principle:**  
Everything remains within a single continuous workspace.

No heavy page switching observed.

**Observed tabs/tools:**

- Summary
- Quiz
- Flashcards
- Mind Map
- Memorization
- Concepts
- Memo
- ChatGPT

---

## Design Language Observations

**Landing page style:**

- minimalistic typography
- large bold headlines
- heavy use of whitespace
- smooth scrolling effects
- integrated product demo videos
- clean monochrome aesthetic

**Observed UX philosophy:**

- AI outputs feel interactive and grounded
- visuals are tightly integrated into workflow
- videos behave like UI components rather than embedded media

**Social proof:**

- “260,000+ students” messaging
- university logo carousels

---

## Localization + Internationalization Observations

**Observed behavior:**

- Korean-first landing page
- English App Store branding internationally
- Korean branding domestically (“유니브 AI”)

**Implications:**

- dual-market branding strategy
- Korean primary market
- gradual internationalization

**Important insight:**  
Localization appears product-aware rather than translation-only.

---

## Technical/Platform Observations

**Publicly observed:**

- “Powered by Gemini”
- “Backed by Google Cloud”

**Possible implications:**

- Gemini API usage
- Google Cloud hosting/infrastructure
- startup cloud credits/program participation

No confirmed frontend stack.

**Possible stack hypotheses:**

- SwiftUI
- Flutter
- React Native (less likely)

---

## Product Strategy Observations

UnivAI appears optimized around:

- rapid study material transformation
- exam preparation workflows
- AI-assisted memorization
- source-grounded study experiences

Less emphasis observed on:

- editable knowledge management
- long-form writing workflows
- collaborative editing
- generalized productivity tooling

This differs from the direction of the Tutor App project, which currently trends more toward:

- AI workspace
- editable notes
- RAG-backed knowledge system
- persistent learning environment
- multilingual support architecture

---

## UX Patterns Worth Studying

### Source-Grounded AI

AI outputs remain visibly connected to the original material.

**Effects:**

- increased trust
- easier verification
- better navigation
- improved comprehension

### Synchronized Navigation

AI-generated outputs can control PDF navigation.

**Potential future implementation idea:**

```
AI block
   ↔ source chunk
   ↔ page number
   ↔ viewport coordinates
```

### Progressive Disclosure

Mind maps and summaries avoid overwhelming the user initially.

**Pattern:**

- collapsed hierarchy first
- details revealed progressively

### Visual Context Injection

Screenshot-based contextual chat is highly effective for PDFs and diagrams.

**Potential long-term inspiration:**

- screenshot-to-chat
- diagram questioning
- visual region references

---

## Things Worth Potentially Exploring Later (Post-MVP)

Potential future-phase inspiration:

- synchronized AI ↔ PDF navigation
- visual snippet references
- expandable concept maps
- structured summaries
- YouTube transcript ingestion
- OCR/image ingestion
- lightweight spaced repetition
- richer AI-generated study representations

**These should NOT override current MVP priorities.**

---

## Things NOT To Copy Blindly

Potential risks:

- over-focusing on exam memorization workflows
- feature overload early
- excessive automation
- neglecting editable knowledge workflows
- prioritizing flashy AI outputs over usability

**Important reminder:**  
The Tutor App project currently has a broader “AI learning workspace” direction than UnivAI’s exam-oriented positioning.
