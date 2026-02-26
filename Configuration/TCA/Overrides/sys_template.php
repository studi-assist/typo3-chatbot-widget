<?php

defined('TYPO3') or die();

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;

ExtensionManagementUtility::addStaticFile(
    'studi_assist_chatbot',
    'Configuration/TypoScript',
    'Studi Assist Chatbot Widget'
);
