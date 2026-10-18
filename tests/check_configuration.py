#!/usr/bin/env python3
"""Check every appearance field across the TYPO3-to-browser configuration path."""
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parent.parent
FIELDS = ['windowWidth', 'windowHeight', 'borderRadius', 'borderColor', 'borderWidth',
          'borderStyle', 'headerHeight', 'headerFontSize', 'iconColor', 'closeIcon',
          'newTabIcon', 'launcherIconSize', 'headerIconSize',
          'launcherIconUrl', 'closeIconUrl', 'newTabIconUrl']
constants = (BASE / 'Configuration/TypoScript/constants.typoscript').read_text()
setup = (BASE / 'Configuration/TypoScript/setup.typoscript').read_text()
fluid = (BASE / 'Resources/Private/Templates/Chatbot/Widget.html').read_text()
controller = (BASE / 'Classes/Controller/ChatbotController.php').read_text()
loader = (BASE / 'Resources/Public/JavaScript/widget-loader.js').read_text()
flex = ET.parse(BASE / 'Configuration/FlexForms/ChatbotWidget.xml')
for name in FIELDS:
    attribute = re.sub('[A-Z]', lambda m: '-' + m[0].lower(), name)
    assert re.search(r'^    ' + name + r' =\s*$', constants, re.M), name
    assert f'{name} = {{$plugin.tx_studiassistchatbot_widget.settings.{name}}}' in setup, name
    assert f"'{name}'" in controller, name
    assert name not in re.search(r'ignoreFlexFormSettingsIfEmpty = (.+)', setup)[1].split(','), f'{name}: preserve explicit zero overrides'
    assert flex.find(f'.//settings.{name}/config') is not None, name
    assert f'data-{attribute}="{{settings.{name}}}"' in fluid, name
    assert f"'{attribute}'" in loader or f"'data-{attribute}'" in loader, name
    escaped_attribute = re.search(
        r'(\d+)\.value = \{\$plugin\.tx_studiassistchatbot_widget\.settings\.' + name + r'\}\n'
        r'    \1\.htmlSpecialChars = 1\n'
        r'    \1\.noTrimWrap = \| data-' + attribute + r'="\|"\|', setup)
    assert escaped_attribute, f'{name}: global attribute must be HTML-escaped'

assert "($this->settings[$name] ?? '') === ''" in controller
assert "$this->view->assign('settings', $this->settings)" in controller
assert "data-icon-resource-url=\"{f:uri.resource(path: 'Icons/unima-Studiassist-03.svg')}\"" in fluid
assert '116.data = path:EXT:studi_assist_chatbot/Resources/Public/Icons/unima-Studiassist-03.svg' in setup
assert '116.htmlSpecialChars = 1' in setup

# Shipped SVGs stay as image files, never executable inline markup.
for name in ['unima-Studiassist-01.svg', 'unima-Studiassist-02.svg', 'unima-Studiassist-03.svg']:
    svg = ET.parse(BASE / 'Resources/Public/Icons' / name)
    assert svg.getroot().attrib['viewBox'] == '0 0 64 64'
    assert all(node.tag.rsplit('}', 1)[-1] not in ['script', 'foreignObject', 'image'] for node in svg.iter())
    assert all(not key.lower().startswith('on') for node in svg.iter() for key in node.attrib)

# Check the inline playground JS as well as the production loader.
subprocess.run(['node', '--check', str(BASE / 'Resources/Public/JavaScript/widget-loader.js')], check=True)
for script in re.findall(r'<script>([\s\S]*?)</script>', (BASE / 'demo.html').read_text()):
    with tempfile.NamedTemporaryFile(suffix='.js', mode='w') as tmp:
        tmp.write(script)
        tmp.flush()
        subprocess.run(['node', '--check', tmp.name], check=True)
print(f'PASS: {len(FIELDS)} appearance settings wired through Constants, Setup, escaped global HTML, FlexForm, Fluid and loader; JS syntax valid.')
