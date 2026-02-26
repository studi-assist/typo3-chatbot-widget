<?php

defined('TYPO3') or die();

use TYPO3\CMS\Core\Information\Typo3Version;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Utility\ExtensionUtility;
use StudiAssist\StudiAssistChatbot\Controller\ChatbotController;

// TYPO3 12+ auto-loads Configuration/page.tsconfig; register manually for 11.5
if (GeneralUtility::makeInstance(Typo3Version::class)->getMajorVersion() < 12) {
    ExtensionManagementUtility::addPageTSConfig(
        "@import 'EXT:studi_assist_chatbot/Configuration/page.tsconfig'"
    );
}

ExtensionUtility::configurePlugin(
    'StudiAssistChatbot',
    'Widget',
    [
        ChatbotController::class => 'widget',
    ],
    [
        ChatbotController::class => '',
    ]
);