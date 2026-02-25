<?php

namespace StudiAssist\StudiAssistChatbot\Controller;

use TYPO3\CMS\Extbase\Mvc\Controller\ActionController;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Core\Utility\GeneralUtility;

class ChatbotController extends ActionController
{
    public function widgetAction(): void
    {
        // Include JS once per page render
        /** @var AssetCollector $assetCollector */
        $assetCollector = GeneralUtility::makeInstance(AssetCollector::class);

        $assetCollector->addJavaScript(
            'studi-assist-chatbot-widget-loader',
            'EXT:studi_assist_chatbot/Resources/Public/JavaScript/widget-loader.js',
            ['defer' => true]
        );
    }
}