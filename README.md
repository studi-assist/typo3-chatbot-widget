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
| `requireConsent` | `0` | Two-click mode: `1` = no request to the chatbot server until the visitor confirms on a consent screen (see below) |
| `consentText` | empty | German text on the consent screen; empty = default notice |
| `consentTextEn` | empty | English text on the consent screen; empty = `consentText` if set (then the whole consent screen stays German), else default notice |
| `privacyPolicyUrl` | empty | Optional link to the site's privacy policy, shown on the consent screen |

Invalid color values fall back to their defaults instead of breaking the widget.

The widget renders inside a Shadow DOM, so the host page's CSS (theme rules for
`button`, `svg`, …) and scripts cannot restyle or alter it.

## Two-click consent (`requireConsent = 1`)

By default the loader calls `/api/chatbot-status` on the chatbot host at page load
(to hide the launcher when the chatbot is unavailable) and loads the iframe on the
first click. With `requireConsent = 1`:

1. **Page load:** only the locally served loader script runs. No request goes to the
   chatbot host or any third party. The availability check is skipped, so the launcher
   is always shown.
2. **First click:** the chat window opens with a local consent screen (text, optional
   privacy-policy link, "Chat starten" button). The iframe has no `src` yet, and the
   "open in new tab" link is hidden.
3. **Second click ("Chat starten"):** the iframe loads. Consent is kept in
   `sessionStorage` (per browser tab, cleared when the tab closes, written only after
   the click), so the visitor is not asked again on every page. From then on the
   normal availability check runs again on page load.

`requireConsent`, `consentText`, `consentTextEn` and `privacyPolicyUrl` are listed in
`ignoreFlexFormSettingsIfEmpty`: an unchecked/empty field on a plugin element falls back
to the site-wide constant, so a plugin cannot silently switch off site-wide consent.

## Language

All widget texts (consent screen, button labels, screen-reader labels) are German when
the browser's preferred language is German (`de`, `de-AT`, …) and English otherwise.
A custom English consent text falls back to the German custom text rather than the
generic English default, so a legally reviewed wording is never silently replaced.
The chat itself keeps the language of the configured `chatbotUrl` (e.g. `/chat/public/de`).

## JavaScript API

The loader exposes `window.studiAssistChatbot` with `open()`, `close()` and `toggle()`.
