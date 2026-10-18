-- Run once against the fresh, dedicated local TYPO3 test database.
UPDATE sys_template
SET include_static_file = CONCAT(include_static_file, ',EXT:studi_assist_chatbot/Configuration/TypoScript/'),
    config = 'page = PAGE
page.meta.viewport = width=device-width, initial-scale=1
page.10 = TEXT
page.10.value (
<style>body{margin:0;background:#f5f8fc;color:#19334b;font:16px/1.5 system-ui,sans-serif}main{max-width:900px;margin:80px auto;padding:0 24px}h1{font-size:clamp(32px,5vw,56px);line-height:1.12}p{max-width:680px}.note{margin-top:28px;padding:18px 22px;background:white;border:1px solid #dbe6ef;border-radius:14px}</style>
<main><h1>StudiAssist Chatbot Widget</h1><p>Diese Seite läuft in einer lokalen TYPO3-13.4-Installation. Das Chat-Widget unten rechts kommt direkt aus der Extension in diesem Repository.</p><div class="note">Öffne den Chat unten rechts. Die Einstellungen des Inhaltselements kannst du im TYPO3-Backend bearbeiten.</div>
)
page.20 < styles.content.get
page.30 = TEXT
page.30.value = </main>
'
WHERE uid = 1;

INSERT INTO tt_content (pid, sorting, CType, list_type, header, pi_flexform)
VALUES (1, 256, 'list', 'studiassistchatbot_widget', 'StudiAssist Widget',
'<?xml version="1.0" encoding="utf-8"?>
<T3FlexForms><data><sheet index="sDEF"><language index="lDEF">
<field index="settings.chatbotUrl"><value index="vDEF">https://website.studi-assist.de/chat/public/de</value></field>
<field index="settings.headerTitle"><value index="vDEF">StudiAssist</value></field>
<field index="settings.iconStyle"><value index="vDEF">arrow-up</value></field>
<field index="settings.closeIcon"><value index="vDEF">close-thin</value></field>
<field index="settings.newTabIcon"><value index="vDEF">external-link-double</value></field>
</language></sheet></data></T3FlexForms>');

-- A second page exercises the optional global TypoScript integration.
INSERT INTO pages (pid, sorting, title, doktype, slug)
VALUES (1, 256, 'Global Widget', 1, '/global');

INSERT INTO sys_template (pid, title, root, constants)
VALUES (LAST_INSERT_ID(), 'Global widget configuration', 0,
'plugin.tx_studiassistchatbot_widget.settings.enableGlobal = 1
plugin.tx_studiassistchatbot_widget.settings.chatbotUrl = https://website.studi-assist.de/chat/public/de
plugin.tx_studiassistchatbot_widget.settings.iconStyle = arrow-up
plugin.tx_studiassistchatbot_widget.settings.closeIcon = close-thin
plugin.tx_studiassistchatbot_widget.settings.newTabIcon = external-link-double
plugin.tx_studiassistchatbot_widget.settings.launcherIconUrl = /fileadmin/icons/preview-arrow.svg
');
