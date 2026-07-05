# typo3-chatbot-widget

TYPO3 extension that adds a floating bottom-right chatbot widget and opens an iframe to a configured chatbot URL.

## Live preview without TYPO3

Open [`demo.html`](demo.html) directly in a browser (no server, no TYPO3 instance needed).
It loads the real shipped loader (`Resources/Public/JavaScript/widget-loader.js`) and lets you
try every tenant-configurable setting live. The panel also generates the matching TypoScript
constants block for copy-pasting into the Constant Editor.

## Configuration

All settings are available both per-plugin (FlexForm on the "Chatbot Widget" content element)
and site-wide via TypoScript constants (`plugin.tx_studiassistchatbot_widget.settings.*`,
used together with `enableGlobal = 1`).

| Setting | Default | Description |
| --- | --- | --- |
| `chatbotUrl` | – (required) | URL of the chat iframe (http/https only) |
| `studyProgram` | empty | Optional study program, appended as `?sp=` (lowercased) |
| `buttonColor` | `#779EC4` | Launcher gradient start & header color |
| `buttonColorEnd` | empty | Launcher gradient end; empty = automatically derived (darkened) from `buttonColor` |
| `textColor` | `#ffffff` | Icon & header text color |
| `headerTitle` | `StudiAssist` | Title in the chat window header (also used as accessible label) |
| `iconStyle` | `chat` | Launcher icon: `chat`, `sparkle`, `cap` or `robot` |
| `showStatusDot` | `1` | Pulsing "online" dot on the launcher (and in the header) |
| `statusDotColor` | `#34c759` | Color of the status dot |
| `windowBackgroundColor` | `#ffffff` | Chat window background (visible while the iframe loads) |
| `teaserText` | empty | Optional speech bubble next to the launcher; empty = off |
| `showHeader` | `1` | `0` hides the header bar and shows a floating close button on the window corner instead |

Invalid color values fall back to their defaults instead of breaking the widget.

## JavaScript API

The loader exposes `window.studiAssistChatbot` with `open()`, `close()` and `toggle()`.
