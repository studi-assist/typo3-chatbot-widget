<?php

$EM_CONF[$_EXTKEY] = [
    'title' => 'Studi Assist Chatbot Widget',
    'description' => 'Adds a floating chatbot launcher that opens an iframe to a configured chatbot URL.',
    'category' => 'plugin',
    'author' => 'Studi Assist',
    'state' => 'beta',
    'clearCacheOnLoad' => true,
    'version' => '0.1.0',
    'constraints' => [
        'depends' => [
            'typo3' => '11.5.0-13.4.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
];