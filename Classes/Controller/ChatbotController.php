<?php

declare(strict_types=1);

namespace StudiAssist\StudiAssistChatbot\Controller;

use Psr\Http\Message\ResponseInterface;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Extbase\Mvc\Controller\ActionController;

class ChatbotController extends ActionController
{
    private AssetCollector $assetCollector;

    public function __construct(AssetCollector $assetCollector)
    {
        $this->assetCollector = $assetCollector;
    }

    public function widgetAction(): ResponseInterface
    {
        $this->assetCollector->addJavaScript(
            'studi-assist-chatbot-widget-loader',
            'EXT:studi_assist_chatbot/Resources/Public/JavaScript/widget-loader.js',
            ['defer' => true]
        );

        return $this->htmlResponse();
    }
}