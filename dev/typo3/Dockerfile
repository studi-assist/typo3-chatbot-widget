FROM php:8.4-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
    git libicu-dev libonig-dev libpng-dev libzip-dev unzip \
    && docker-php-ext-install pdo_mysql mysqli intl mbstring opcache zip gd \
    && a2enmod rewrite \
    && sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
    && printf '<Directory /var/www/html/public>\nAllowOverride All\nRequire all granted\n</Directory>\n' > /etc/apache2/conf-available/typo3.conf \
    && a2enconf typo3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY php.ini /usr/local/etc/php/conf.d/typo3.ini

WORKDIR /var/www/html
