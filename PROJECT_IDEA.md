# CLōD Navigator

## One-Line Pitch

An AI beginner page guide for CLōD and complex AI tools: users ask in plain language, and the plugin visually points to exactly where they should click next.

## Background

This project is for a 6-hour hackathon. The MVP will use Tampermonkey, a third-party browser userscript plugin, to inject our JavaScript directly into the target webpage. This lets us simulate the core browser-extension experience quickly while avoiding the complexity of building, packaging, permission-configuring, and publishing a real Chrome extension.

The first demo target is one web page/product: CLōD or an AI coding tool page. The long-term vision can expand to any complex SaaS or AI tool.

## Technical Approach

For the hackathon version, Tampermonkey is the fastest path to a working demo. Instead of going through the full browser-extension release process, we install one userscript locally and use it to add the CLōD Navigator interface on top of an existing website.

The userscript will:

- Inject a right-side assistant sidebar into the current page
- Read visible page text and interactive elements such as buttons, inputs, and menus
- Match the user's plain-language request to a likely target element
- Add overlays, spotlights, arrows, and short instructions around that target
- Listen for user clicks so the guide can confirm success or move to the next step

This approach keeps the MVP focused on proving the key experience: the user asks for help, and the page visually points to exactly where they should click.

## Target Users

The target users are non-technical AI beginners who want to try AI coding or AI tools but get blocked by unfamiliar UI terms and workflows.

Examples of user confusion:

- "Where do I start?"
- "Where do I type my request?"
- "What is an API Key?"
- "Where should I paste the API Key?"
- "Where is the URL?"
- "Which button should I click?"

The product helps these users build confidence quickly by turning confusing web pages into step-by-step visual guidance.

## Core Problem

Many beginners do not fail because AI tools are impossible to use. They fail because the first screen feels intimidating.

Complex AI tools often contain English labels, API settings, technical parameters, sidebars, buttons, and empty states. A beginner may give up in the first minute because they do not know what to click.

Traditional chatbots explain what to do in text. This product shows users where to click directly on the page.

## Product Concept

The plugin injects a small assistant UI into the website. The UI can be either:

- A minimal right-side sidebar
- A floating chatbox

For the hackathon MVP, the right-side sidebar is preferred because it is easier to demo and easier for judges to understand.

The user enters a plain-language request such as:

> I want to test this, but I do not know where to click.

The plugin searches the current page, identifies the most relevant button, input, menu, or text area, and then visually guides the user by using:

- A dark page overlay
- A spotlight around the target element
- A clear arrow or pointer
- A short instruction such as "Click here first"

The assistant should avoid long explanations. The experience should feel direct, visual, and confidence-building.

## MVP Scope

The 6-hour MVP should not try to support every website. It should focus on one selected AI coding page and a small set of common beginner tasks.

### Must Have

- Tampermonkey userscript
- Injected right-side sidebar
- Plain-language input box
- Keyword or rule-based intent matching
- Highlight target element on the current page
- Arrow, pointer, or spotlight effect
- Short guidance message
- Positive feedback after the user clicks the correct target

### Nice To Have

- Step-by-step guidance for two-step flows
- Listen for the user's click before showing the next step
- Gentle recovery message if the user does not succeed
- Small celebration or confidence-building message after success

### Out Of Scope For MVP

- Publishing a real Chrome extension
- Supporting every website perfectly
- Full AI agent automation
- Real mouse cursor control
- User accounts
- Persistent history
- Complex multi-page crawling

## Example User Flows

### Flow 1: Start Using The Tool

User says:

> I do not know how to start.

Plugin behavior:

1. Darken the page.
2. Highlight the main input box or start button.
3. Show an arrow and short message: "Start here."
4. After the user interacts, show the next target if needed.

### Flow 2: Find Where To Type

User says:

> Where do I type what I want?

Plugin behavior:

1. Highlight the main prompt/input area.
2. Show: "Type your request here."

### Flow 3: Run Or Submit

User says:

> How do I run it?

Plugin behavior:

1. Highlight the Run, Submit, Send, or Start button.
2. Show: "Click this button to run your request."

### Flow 4: API Key Confusion

User says:

> What is API Key and where do I put it?

Plugin behavior:

1. Highlight the API Key input field if visible.
2. If not visible, highlight the Settings, Account, Developer, or API section.
3. Show a short explanation: "An API Key is like a password for connecting to an AI service. Paste it here."

## UX Principles

### 1. Speak Less, Point More

The assistant should not answer with long paragraphs. The main value is visual guidance.

Bad:

> You should look at the left sidebar and find the settings area...

Good:

> Click here first.

### 2. Make The Page Feel Simpler

When the user asks for help, the page should temporarily become easier to understand:

- Dim irrelevant areas
- Spotlight the target
- Use one strong visual cue
- Avoid multiple competing highlights

### 3. Protect User Confidence

The product is for beginners. The tone should be warm, direct, and non-judgmental.

Success examples:

- "Nice, you found the right place."
- "Great. You just completed the first step."
- "That is it. You are ready for the next step."

Recovery examples:

- "Sorry, I did not point to the right place. Try asking with words like 'start', 'run', or 'API key'."
- "I may need the page to show the settings area first. Try opening the dashboard."

## Wow Feature

The main demo moment is the spotlight/highlight mode.

When the user asks:

> I want to start but I do not know where to click.

The entire webpage darkens, and only the correct button or input remains highlighted with an animated pointer.

This creates an immediate visual contrast between the confusing original page and the guided experience.

## Step-By-Step Guarding

For multi-step actions, the plugin can use a simple scripted flow.

Example:

1. Highlight the prompt input.
2. Wait until the user clicks or types.
3. Highlight the Run button.
4. Wait until the user clicks it.
5. Show positive feedback.

The operation order must be correct. This is more important than trying to handle every possible page.

## Commercial Value

This product is not only a helper for individual users. It can become an onboarding layer for SaaS and AI companies.

Potential customers:

- AI coding tools
- Developer platforms
- SaaS dashboards
- No-code tools
- Education platforms
- Enterprise internal tools

Business value:

- Reduce new-user churn
- Improve activation rate
- Reduce customer support tickets
- Help non-technical users adopt complex tools
- Turn documentation into real-time visual guidance

## Pitch Structure

### 1. Hook

Everyone wants to try AI coding, but many beginners give up in the first minute because they do not know what to click.

### 2. Demo

Open a complex AI coding page. Type:

> I do not know how to start.

The page darkens. A spotlight and pointer appear on the correct button or input.

### 3. Differentiation

Normal chatbots tell users what to do. CLōD Navigator shows users where to click.

### 4. Value

For beginners, it reduces fear and builds confidence. For SaaS companies, it reduces churn and improves onboarding.

### 5. Vision

Today we validate the idea on one AI coding page. Tomorrow this can become a universal visual onboarding copilot for any complex web product.

## Recommended Positioning

Chinese:

> 面向 AI 新手的可视化网页操作向导。

English:

> A visual onboarding copilot for complex AI tools.

## Product Name

> CLōD Navigator
