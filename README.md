# 🔍 JS Visualizer

> **An interactive JavaScript runtime visualizer** — step through your code and watch the Call Stack, Web APIs, Microtask Queue, Task Queue, and Event Loop come alive in real time.

🚀 **Live Demo:** [https://js-visualizer-a78a1.web.app/](https://js-visualizer-a78a1.web.app/)

---

## ✨ What Is This?

JS Visualizer is a browser-based educational tool that helps developers **understand how JavaScript really works under the hood**. Write (or pick) a snippet, hit **Run & Visualize**, and step through each execution phase one frame at a time.

It demystifies concepts that trip up developers of all levels:

- Why does `setTimeout(..., 0)` run *after* a `Promise.then()`?
- What exactly is the **Event Loop** doing between each task?
- How do **closures** capture their lexical scope?
- When does the **Call Stack** grow and unwind?

---

## 🎯 Features

| Feature | Description |
|---|---|
| 📝 **Monaco Code Editor** | Full-featured editor (same engine as VS Code) with syntax highlighting |
| 🏗️ **Call Stack Visualizer** | See function frames push and pop in real time |
| 🌐 **Web APIs Panel** | Track active `setTimeout` timers and `fetch` requests |
| ⚡ **Microtask Queue** | Watch `Promise.then()` callbacks queue up and drain |
| 📬 **Task Queue** | See macrotasks (setTimeout, etc.) wait their turn |
| 🔄 **Event Loop Indicator** | Animated indicator showing the current event loop phase |
| 🖥️ **Execution Context** | Inspect variable bindings in each scope/environment |
| 🎮 **Step Controls** | Play, pause, step forward/backward through execution |
| ⌨️ **Keyboard Shortcuts** | Fully keyboard-navigable for power users |
| 📋 **Console Panel** | See `console.log` output exactly as JS produces it |
| 💡 **Built-in Examples** | 8 curated snippets covering the most common async patterns |

---

## 🗂️ Built-in Examples

| Example | What It Teaches |
|---|---|
| **setTimeout Basics** | How callbacks enter the task queue |
| **Promise Chain** | How `.then()` uses the microtask queue |
| **Event Loop Order** | The classic interview question: microtasks before macrotasks |
| **Mixed Async** | `setTimeout` + `Promise` interleaved execution |
| **new Promise()** | Synchronous executor vs. async `.then()` |
| **Closure Demo** | Lexical scope and variable capture |
| **Nested setTimeout** | Cascading timer scheduling |
| **Call Stack Growth** | Function stacking and unwinding |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 19 |
| **Language** | TypeScript |
| **Bundler** | Vite 6 |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) |
| **JS Parser** | Acorn + acorn-walk |
| **State Management** | Zustand + Immer |
| **Animations** | Motion (Framer Motion) |
| **Icons** | Lucide React |
| **Deployment** | Firebase Hosting |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install & Run Locally

```bash
# Clone the repo
git clone https://github.com/your-username/JS-Visualizer.git
cd JS-Visualizer

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The output will be in the `dist/` directory.

### Type-Check Only

```bash
npm run typecheck
```

---

## 📁 Project Structure

```
JS-Visualizer/
├── src/
│   ├── components/
│   │   ├── console/        # Console output panel
│   │   ├── controls/       # Step controls & description
│   │   ├── editor/         # Monaco code editor panel
│   │   ├── layout/         # App shell / layout
│   │   └── visualizer/     # All runtime visualizer panels
│   │       ├── CallStack.tsx
│   │       ├── ExecutionContext.tsx
│   │       ├── WebAPIs.tsx
│   │       ├── MicrotaskQueue.tsx
│   │       ├── TaskQueue.tsx
│   │       └── EventLoopIndicator.tsx
│   ├── engine/             # JS parser & interpreter engine
│   │   ├── parser/
│   │   ├── interpreter/
│   │   └── runtime/
│   ├── examples/           # Built-in code examples
│   ├── hooks/              # Playback & keyboard shortcut hooks
│   ├── store/              # Zustand global state
│   ├── theme/              # Design tokens / color palette
│   ├── animations/         # Shared animation variants
│   └── App.tsx
├── index.html
├── vite.config.ts
└── tsconfig.json
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a pull request.

---

## 📄 License

This project is open source. See [LICENSE](LICENSE) for details.
