Create an initial mobile app design system and core screen concepts inside `docs/design/planbee.pen`.

# Product

Product name: **Planbee**

Planbee combines the concepts of **Plan B** and **Bee**.

It is an AI-powered travel assistant designed to help travelers solve unexpected problems and make decisions **while they are already traveling**.

The core idea is:

> Plans change. Planbee helps.

Planbee should not feel like a generic AI chatbot or a traditional travel-planning app.

It should feel like a small, reliable travel companion that quickly suggests the user's "next best option" when their original plan changes.

Examples:

- "It's raining. What should I do nearby?"
- "I have two hours before my train."
- "The place I wanted to visit is closed."
- "I'm tired. Is there somewhere close by?"
- "What should I do around here?"
- "Find somewhere indoors."
- "Recommend something to eat nearby."

The application will communicate with an AI server for recommendations and Q&A.

Travel destinations and place information will primarily come from Korea Tourism Organization Open API data.

Therefore, visually distinguish structured place information from conversational AI explanations.

---

# Brand Personality

Planbee should feel:

- Warm
- Energetic
- Reliable
- Helpful
- Simple
- Modern
- Travel-oriented

Use the bee concept subtly.

Avoid making the interface look childish or overly cartoonish.

Do NOT fill the interface with bee illustrations, honeycomb patterns, or yellow/black stripes.

Use small bee or hexagonal motifs only for brand-specific elements such as:

- AI assistant identity
- AI loading state
- small badges
- logo placeholder

---

# Color System

Create reusable design variables.

## Brand

Honey / Primary
`#FFB020`

Honey Dark
`#E89100`

Honey Light
`#FFF1CC`

Bee Black
`#171717`

## Neutral

Background
`#FAFAF8`

Surface
`#FFFFFF`

Cream Surface
`#FFF9EE`

Primary Text
`#171717`

Secondary Text
`#737373`

Body Text
`#333333`

Border
`#E8E6E1`

## Semantic

Success
`#2E9B64`

Error
`#D94A4A`

Use warm white as the dominant application background.

Do NOT use yellow as the dominant screen background.

Use Honey primarily for:

- AI recommendations
- highlights
- selected states
- small brand elements
- badges

Use Bee Black for important CTA buttons.

---

# Typography

Design primarily for Korean mobile users.

Use Pretendard when available. Otherwise use a clean modern sans-serif font.

Create the following typography hierarchy:

Display
28px / Bold

Heading 1
24px / Bold

Heading 2
20px / SemiBold

Title
17px / SemiBold

Body
16px / Regular

Body Small
14px / Regular

Caption
12px / Medium

Prioritize readability because users may interact with the application while walking or traveling.

---

# Spacing

Create a consistent spacing scale:

4
8
12
16
20
24
32
40

Default horizontal screen padding:

20px

---

# Shape

Card radius:
16px

Button radius:
14px

Input radius:
16px

Chip radius:
999px

Use subtle shadows only.

Example:

0px 2px 12px rgba(0,0,0,0.06)

Avoid heavy shadows.

---

# Icons

Prefer Lucide icons.

Use simple outlined icons.

Keep icon styling consistent throughout the application.

---

# Components

Create reusable components for the following.

## Primary Button

Height: 52px

Background:
Bee Black

Text:
White

Radius:
14px

Example:

"다른 장소 찾아보기"

---

## Secondary Button

White or warm background.

Subtle border.

Bee Black text.

---

## Chips

Create chips for quick AI follow-up actions.

Examples:

"더 가까운 곳"

"실내 위주"

"카페 위주"

"다른 장소"

"걷기 싫어요"

Selected chips may use Honey Light.

---

## AI Identity

Create a simple Planbee AI identity.

Use either:

- subtle bee symbol
- abstract hexagonal symbol
- simple placeholder brand mark

Do not create a childish mascot.

---

## AI Action Card

This is an important brand component.

Use Honey Light as the primary surface.

Example content:

"Planbee에게 물어보기"

"지금 상황을 알려주세요"

"현재 위치와 상황을 알려주면 새로운 계획을 찾아드릴게요."

Include an arrow or CTA.

---

## Place Card

Create a reusable tourism/place card.

It should support:

- image
- category
- place name
- distance
- estimated walking/travel time
- tags
- optional operating status
- bookmark action

Example:

경복궁

850m · 도보 12분

#역사
#사진명소

Optionally include a subtle data-source label:

"한국관광공사 제공"

The source label should never dominate the card.

---

## AI Recommendation Card

Create a larger recommendation component.

It should support:

- image
- BEST MATCH badge
- place name
- AI recommendation explanation
- distance
- estimated travel time
- estimated stay duration
- detail CTA
- bookmark

This should visually combine AI reasoning and structured tourism data.

---

## Search / AI Input

Create a large, touch-friendly input component.

Placeholder:

"지금 어떤 도움이 필요하세요?"

Support a send action.

---

## Bottom Navigation

Create four navigation items:

홈

탐색

저장

MY

Use Bee Black for the active icon/text.

Honey may be used as a small active indicator.

---

# Screen 01 — Design System

Create a dedicated design-system frame containing:

- Brand colors
- Neutral colors
- Semantic colors
- Typography
- Spacing
- Buttons
- Chips
- Inputs
- AI identity
- AI Action Card
- Place Cards
- AI Recommendation Card
- Bottom Navigation

Clearly label every section.

This frame will act as the visual source of truth for future AI agents.

---

# Screen 02 — Home

Create a mobile home screen.

Target width:
390px

Structure:

Header

Planbee logo/name

Small location indicator

Example:
"서울 · 종로구"

Greeting:

"지금 어떤 도움이 필요하세요?"

Supporting copy:

"계획이 바뀌어도 괜찮아요.
Planbee가 다음 계획을 찾아드릴게요."

AI Action Card

Then:

"빠르게 도움받기"

Create four quick actions:

"근처 추천"
location icon

"남는 시간"
clock icon

"일정 변경"
refresh or route icon

"코스 추천"
map icon

Then:

"지금 주변에는"

Show horizontally scrollable Place Cards.

Bottom navigation.

The Home screen should NOT resemble a generic chatbot.

---

# Screen 03 — AI Assistant

Create a conversational travel assistance screen.

Example user question:

"비 오는데 한두 시간 정도 어디 갈 곳 없어?"

Planbee response:

"비를 피하면서 2시간 정도 보내기 좋은 곳을 찾아봤어요."

Then show structured recommendations instead of only chat bubbles.

Display one AI Recommendation Card as:

BEST MATCH

국립현대미술관 서울

"실내에서 여유롭게 둘러보기 좋아요.
현재 위치에서도 멀지 않아요."

1.2km

약 15분

예상 체류 1시간 30분

CTA:
"자세히 보기"

Below it show:

"다른 선택지도 있어요"

with smaller Place Cards.

At the bottom provide follow-up chips:

"더 가까운 곳"

"카페 위주"

"다른 장소"

The AI conversation should feel action-oriented rather than text-heavy.

---

# Screen 04 — Place Detail

Create a tourism-place detail screen.

Include:

- Hero image
- Back button
- Bookmark
- Category
- Place name
- address
- operating information
- distance
- tags
- short description
- AI recommendation reason
- map/location section
- tourism data source indication

Primary CTA:

"여기로 가기"

Secondary AI action:

"Planbee에게 물어보기"

---

# Screen 05 — AI Loading State

Create a lightweight Planbee-specific loading state.

Example:

"Planbee가 새로운 계획을 찾고 있어요."

Use subtle animated-looking hexagonal/bee-inspired visual elements.

Do not use a large mascot illustration.

---

# UX Principles

Follow these principles throughout the design.

1. The application is primarily used DURING travel.

2. Important actions must be easy to tap while moving.

3. Avoid information overload.

4. AI responses should lead to actions.

5. Prefer cards, chips, maps and structured information over long AI paragraphs.

6. Tourism API information should visually feel reliable and structured.

7. AI should explain WHY a place fits the user's situation.

8. Recommendations should make it easy to immediately choose the next action.

9. Maintain strong visual hierarchy.

10. Keep the UI warm but not childish.

---

# Important

Create this as a reusable foundation rather than a collection of disconnected mockups.

Use shared variables and reusable components wherever possible.

Name layers and components clearly in English so future coding agents can understand the design structure.

Examples:

`Color/Brand/Honey`

`Button/Primary`

`Chip/QuickAction`

`Card/Place`

`Card/AIRecommendation`

`Navigation/Bottom`

`AI/Identity`

`AI/ActionCard`

Make the Design System the source of truth and construct the application screens using those reusable components.

The purpose of this `.pen` file is to be referenced later by coding agents such as Claude Code or Codex while implementing the actual Planbee application.
