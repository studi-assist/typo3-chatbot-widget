<?php

defined('TYPO3') or die();

call_user_func(function () {
    \TYPO3\CMS\Extbase\Utility\ExtensionUtility::configurePlugin(
        'StudiAssistChatbot',
        'Widget',
        [\StudiAssist\StudiAssistChatbot\Controller\ChatbotController::class => 'widget'],
        []
    );
});