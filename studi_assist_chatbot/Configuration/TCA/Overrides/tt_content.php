<?php

defined('TYPO3') or die();

call_user_func(function () {
    \TYPO3\CMS\Extbase\Utility\ExtensionUtility::registerPlugin(
        'StudiAssistChatbot',
        'Widget',
        'Chatbot Widget'
    );

    $pluginSignature = 'studiassistchatbot_widget';

    // Add FlexForm
    \TYPO3\CMS\Core\Utility\ExtensionManagementUtility::addPiFlexFormValue(
        $pluginSignature,
        'FILE:EXT:studi_assist_chatbot/Configuration/FlexForms/ChatbotWidget.xml'
    );
});