<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'StudiAssist Chatbot Widget',
    'description' => 'Floating chatbot widget that opens an iframe to a configured chatbot URL.',
    'category' => 'plugin',
    'author' => 'StudiAssist',
    'state' => 'stable',
    'clearCacheOnLoad' => true,
    'version' => '1.2.0',
    'constraints' => [
        'depends' => [
            'typo3' => '11.5.0-13.4.99',
            'fluid_styled_content' => '',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
];