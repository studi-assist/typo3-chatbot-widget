# Local TYPO3 preview

Requires Docker Desktop (or set `DOCKER_CONTEXT` to another running Docker
context). The setup uses TYPO3 13.4, PHP 8.4 and MariaDB 10.11. It creates a
Composer project in the ignored `app/` directory and mounts this repository as
the live `studi_assist_chatbot` extension. It binds only to localhost:8081.

From the repository root, run once:

```sh
bash dev/typo3/setup.sh
```

Open the [plugin preview](http://localhost:8081/) or the
[global TypoScript preview](http://localhost:8081/global). The real public
StudiAssist chat is configured in both. The [TYPO3 backend](http://localhost:8081/typo3/)
uses username `admin`; read the generated password from
`dev/typo3/app/.local-admin-password` on your computer. The plugin content
element is on the Home page. Edit it in **Web > Page** to try settings.
The global page uses a sample SVG at `/fileadmin/icons/preview-arrow.svg` as
`launcherIconUrl`, demonstrating the same public path format that a file
uploaded through TYPO3's Filelist can use.

After a computer restart, start the containers again:

```sh
docker --context desktop-linux compose -f dev/typo3/compose.yaml up -d
```

Stop them with:

```sh
docker --context desktop-linux compose -f dev/typo3/compose.yaml down
```

The database is kept in a Docker volume across stops. `down --volumes` would
delete the local test database. Changes to the extension files are mounted
directly into TYPO3; after PHP or TypoScript edits, clear the cache with:

```sh
docker --context desktop-linux compose -f dev/typo3/compose.yaml exec -T web vendor/bin/typo3 cache:flush
```

To run the browser smoke test, launch a disposable Chrome with DevTools on
port 9223 and run `node tests/typo3_browser.mjs`. It checks the plugin page,
global page, asset URLs, selected icons, real iframe URL and desktop width.
