<?php

defined('TYPO3') or die();

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Extbase\Utility\ExtensionUtility;

ExtensionUtility::registerPlugin(
    'StudiAssistChatbot',
    'Widget',
    'Chatbot Widget',
    'content-plugin'
);

$pluginSignature = 'studiassistchatbot_widget';

// Show FlexForm field for this plugin
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_addlist'][$pluginSignature] = 'pi_flexform';

// Hide default Extbase fields not needed here
$GLOBALS['TCA']['tt_content']['types']['list']['subtypes_excludelist'][$pluginSignature] = 'recursive,pages';

ExtensionManagementUtility::addPiFlexFormValue(
    $pluginSignature,
    'FILE:EXT:studi_assist_chatbot/Configuration/FlexForms/ChatbotWidget.xml'
);