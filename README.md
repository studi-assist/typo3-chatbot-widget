# typo3-chatbot-widget

TYPO3 extension that adds a floating bottom-right chatbot widget and opens an iframe to a configured chatbot URL.

## Live preview without TYPO3

Start the local design playground (Python 3, no dependencies or TYPO3 required):

```sh
python3 scripts/serve-demo.py
# Optional alternative port: python3 scripts/serve-demo.py --port 8001
```

Open [http://localhost:8000/demo.html](http://localhost:8000/demo.html).
The **Local iframe placeholder** is enabled by default, so design tests make no
requests to an external chatbot. Disable it to preview the configured real chat.
The exported TypoScript always uses the configured chat URL, never the mock URL.
You can also open [`demo.html`](demo.html) directly with the placeholder disabled
(the local placeholder uses an HTTP URL and needs the demo server).
It loads the real shipped loader (`Resources/Public/JavaScript/widget-loader.js`) and lets you
try every tenant-configurable setting live. Its neutral **Standard**, **Ocean**,
**Minimal** and **Contrast** presets demonstrate different colors, sizes and icons.
The demo starts with **Standard** (600px desktop width) and uses the same public demo
chat URL for every preset. The panel generates matching TypoScript constants for copying.
Institution-specific branding belongs in your own TYPO3 configuration: colors,
titles, dimensions and image URLs can all be changed without modifying the extension.

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
| `iconStyle` | `chat` | Launcher icon: `chat`, `sparkle`, `cap`, `robot` or `arrow-up` (image file) |
| `showStatusDot` | `1` | Pulsing "online" dot on the launcher (and in the header) |
| `statusDotColor` | `#34c759` | Color of the status dot |
| `windowBackgroundColor` | `#ffffff` | Chat window background (visible while the iframe loads) |
| `teaserText` | empty | Optional speech bubble next to the launcher; empty = off |
| `showHeader` | `1` | `0` hides the header bar and shows a floating close button on the window corner instead |
| `windowWidth` | empty → `600px` desktop / `500px` tablet / responsive mobile | Window content width; 240–2000px, capped to the viewport |
| `windowHeight` | empty → `760px` desktop / `720px` tablet / responsive mobile | Window content height; 240–2000px, capped to available viewport height |
| `borderRadius` | empty → `24px` desktop/tablet / `20px` mobile | Radius on window, header and iframe body; 0–100px |
| `borderColor` | empty → `rgba(15, 31, 48, 0.08)` | Border color as 3- or 6-digit hex |
| `borderWidth` | empty → `1px` | Border width; 0–12px (use `0` to remove it) |
| `borderStyle` | empty → `solid` | `solid`, `dashed`, `dotted`, `double`, `none` |
| `headerHeight` | empty → `52px` | Header height; 32–160px |
| `headerFontSize` | empty → `14px` | Header title size; 10–32px |
| `iconColor` | empty → existing colors | Hex color for launcher, close and new-tab icons; header title still uses `textColor` |
| `closeIcon` | empty → `x` | `x`, `minus`, `chevron-down`, `close-thin` (image file); also applies to launcher close state |
| `newTabIcon` | empty → `external-link` in header | `external-link`, `arrow-up-right`, `external-link-double` (image file); an explicit selection also enables a floating new-tab link in headerless mode |
| `launcherIconSize` | empty → `42px` desktop/tablet / `34px` mobile | Launcher SVG size; 16–48px |
| `headerIconSize` | empty → `15px` header / `16px` floating | Close/new-tab SVG size; 12–32px |
| `launcherIconUrl` | empty | Own logo/icon image URL; overrides `iconStyle` |
| `closeIconUrl` | empty | Own close image URL; applies to header, floating close button and open launcher |
| `newTabIconUrl` | empty | Own new-tab image URL; also enables the floating link without a header |
| `requireConsent` | `0` | Two-click mode: `1` = no request to the chatbot server until the visitor confirms on a consent screen (see below) |
| `consentText` | empty | German text on the consent screen; empty = default notice |
| `consentTextEn` | empty | English text on the consent screen; empty = `consentText` if set (then the whole consent screen stays German), else default notice |
| `privacyPolicyUrl` | empty | Optional link to the site's privacy policy, shown on the consent screen |

New appearance settings are optional and default to empty in Constants and FlexForm.
An empty FlexForm appearance field inherits the site-wide TypoScript value.
The controller resolves these strictly empty fields on TYPO3 11–13, preserving
explicit `0` overrides for square corners and a borderless window.
With no appearance overrides, the desktop window is now 600px wide. Tablet width
remains 500px and mobile sizing stays responsive; the existing heights, radii, icon
colors and headerless controls stay as before. Configured sizes apply at every breakpoint and
are capped to the available viewport; the launcher and window offsets remain responsive.
Desktop is above 1200px, tablet is 561–1200px, mobile is at most 560px.
Window dimensions retain the existing content-box sizing (borders add to the requested size).

Pixel settings accept a nonnegative decimal number with optional `px` (e.g. `16` or
`16px`). Other units, CSS expressions and out-of-range values are rejected and fall
back to the existing responsive defaults. Colors accept only `#rgb` or `#rrggbb`.
Icon names and border styles use fixed allowlists; arbitrary HTML/SVG is never accepted.
In headerless mode, a configured icon color uses `buttonColor` behind the floating
buttons to keep light icons visible. The new-tab link remains hidden until consent.

The widget only provides the outer launcher, window, header and existing optional
two-click consent gate. Chat greetings, program selection, chat privacy information
and input fields belong to the separate chatbot application inside the iframe.
The local placeholder is only a demo asset and never enabled by the production loader.

The widget renders inside a Shadow DOM, so the host page's CSS (theme rules for
`button`, `svg`, …) and scripts cannot restyle or alter it.

## Own logos and icon files

Upload your SVG, PNG or WebP to TYPO3's **Filelist**, then enter its public URL/path
in the plugin field (for example `/fileadmin/icons/university-logo.svg`) or in the
matching TypoScript constant. No JavaScript changes are needed for additional files:

```typoscript
plugin.tx_studiassistchatbot_widget.settings {
  launcherIconUrl = /fileadmin/icons/university-logo.svg
  closeIconUrl = /fileadmin/icons/close.svg
  newTabIconUrl = /fileadmin/icons/new-tab.svg
}
```

An image URL overrides the corresponding icon selection. Empty plugin fields inherit
the site-wide value. Only HTTP(S) URLs and relative public paths are accepted; local
computer paths, `javascript:`, `data:` and inline markup are not supported. Images
load through `<img>`, never by inserting their SVG source into the Shadow DOM.
If a file is missing or cannot be decoded as an image, the built-in icon remains visible.

Files keep their original colors and proportions; `iconColor` affects the built-in
SVG icons only. `launcherIconSize` and `headerIconSize` also size image files.
Floating buttons with image files use `buttonColor` as their background.
An image URL for the new-tab button enables that button in headerless mode and
respects the existing consent gate. With two-click consent, third-party icon images
are deferred until consent; files hosted on the university's own origin can load immediately.

The three provided SVGs are shipped unchanged in `Resources/Public/Icons/`:

| Selection | File | Used for |
| --- | --- | --- |
| `iconStyle = arrow-up` | `arrow-up.svg` | Launcher arrow |
| `closeIcon = close-thin` | `close-thin.svg` | Close button |
| `newTabIcon = external-link-double` | `external-link-double.svg` | Open in new tab |

Select them in the backend or playground. Previously saved icon selection keys
remain supported as compatibility aliases. TYPO3 resolves the public resource path,
including hashed asset paths, independently of JavaScript compression. Plain embeds
and the playground resolve image URLs relative to the shipped loader. The neutral
**Contrast** preset selects all three; switching back to **Standard** restores its built-in icons.

## Custom design example

The extension contains no institution-specific presets or defaults. The following
example uses the neutral **Contrast** design. Adapt its colors, title, dimensions,
icons and optional image URLs to your own branding, and replace the example URL
with your institution's chatbot URL. The same settings work per plugin and globally.

```typoscript
plugin.tx_studiassistchatbot_widget.settings {
  enableGlobal = 1
  chatbotUrl = https://your-tenant.studi-assist.de/chat
  headerTitle = Chat-Assistent
  buttonColor = #111827
  buttonColorEnd = #111827
  textColor = #ffffff
  windowBackgroundColor = #ffffff
  windowWidth = 800px
  windowHeight = 900px
  borderRadius = 16px
  borderColor = #111827
  borderWidth = 2px
  borderStyle = solid
  headerHeight = 72px
  headerFontSize = 18px
  iconColor = #ffffff
  launcherIconSize = 42px
  headerIconSize = 24px
  iconStyle = arrow-up
  closeIcon = close-thin
  newTabIcon = external-link-double
  showHeader = 1
  showStatusDot = 0
}
```

## Validation

```sh
node --check Resources/Public/JavaScript/widget-loader.js
python3 tests/check_configuration.py
```

Browser regression tests use Node.js 22+ and Chrome's DevTools protocol, without
installing dependencies. Start the demo server, then launch Chrome with a temporary
profile and run the suite (adjust the Chrome path for your OS):

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --remote-debugging-port=9223 --user-data-dir=/tmp/studi-assist-test-browser
node tests/browser.mjs
```

The suite checks legacy rendering against the pre-change loader (except the requested
600px desktop width), desktop/tablet/mobile
sizes, all appearance controls, safe fallbacks, icons with/without a header, consent,
presets, own image URLs, shipped SVG files, image-error fallbacks, external-image
consent, the generated TypoScript and rapid preview rebuilds. It needs the baseline
Git revision (defaults to `53c8f5f`, override with `BASELINE_REF`) to compare legacy defaults.
Set `DEMO_URL` and `CDP_URL` for non-default server/debug ports.

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
`destroy()` removes the widget and its document listener, allowing clean preview rebuilds.
