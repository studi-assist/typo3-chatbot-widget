<?php

declare(strict_types=1);

namespace StudiAssist\StudiAssistChatbot\Controller;

use Psr\Http\Message\ResponseInterface;
use TYPO3\CMS\Core\Page\AssetCollector;
use TYPO3\CMS\Extbase\Configuration\ConfigurationManagerInterface;
use TYPO3\CMS\Extbase\Mvc\Controller\ActionController;

class ChatbotController extends ActionController
{
    private const APPEARANCE_SETTINGS = [
        'windowWidth', 'windowHeight', 'borderRadius', 'borderColor', 'borderWidth',
        'borderStyle', 'headerHeight', 'headerFontSize', 'iconColor', 'closeIcon',
        'newTabIcon', 'launcherIconSize', 'headerIconSize',
        'launcherIconUrl', 'closeIconUrl', 'newTabIconUrl',
    ];

    private AssetCollector $assetCollector;

    public function __construct(AssetCollector $assetCollector)
    {
        $this->assetCollector = $assetCollector;
    }

    public function widgetAction(): ResponseInterface
    {
        // Use a strict empty-string check: Extbase's ignoreFlexFormSettingsIfEmpty
        // also discards "0" (a valid square corner / borderless override), and
        // is unavailable on TYPO3 11. Preserve explicit zeros on every version.
        $typoScript = $this->configurationManager->getConfiguration(
            ConfigurationManagerInterface::CONFIGURATION_TYPE_FULL_TYPOSCRIPT
        );
        $defaults = $typoScript['plugin.']['tx_studiassistchatbot_widget.']['settings.'] ?? [];
        foreach (self::APPEARANCE_SETTINGS as $name) {
            if (($this->settings[$name] ?? '') === '') {
                $this->settings[$name] = $defaults[$name] ?? '';
            }
        }
        $this->view->assign('settings', $this->settings);

        $this->assetCollector->addJavaScript(
            'studi-assist-chatbot-widget-loader',
            'EXT:studi_assist_chatbot/Resources/Public/JavaScript/widget-loader.js',
            ['defer' => true]
        );

        return $this->htmlResponse();
    }
}