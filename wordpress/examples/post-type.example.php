<?php
/**
 * ПРИМЕР: Регистрация кастомных Post Types, связей и коллекций в теме.
 *
 * Скопируй нужный паттерн в inc/post-types/site.php (или сгенерируй через CLI:
 * npx soinproduction-kit create post-type case_study)
 * и добавь слаг в "postTypes": ["case_study"] в frontend/kit.config.json.
 */
namespace SiteTheme;
defined('ABSPATH') || exit;

add_action('init', function () {
	/**
	 * ПАТТЕРН 1: Публичный Post Type с собственной страницей и архивом (как service / post)
	 * - Имеет свой URL (/cases/my-case)
	 * - Автоматически появляется в Settings -> Archive pages (привязка архивной страницы)
	 * - Имеет карточку (thumbnail, excerpt, title) и контент из Gutenberg-блоков
	 * - Может выбираться в связях секций (addRelationship) и в ссылках кнопок/меню
	 */
	register_post_type('case_study', [
		'labels'       => [
			'name'          => 'Кейсы',
			'singular_name' => 'Кейс',
			'add_new_item'  => 'Добавить кейс',
			'edit_item'     => 'Редактировать кейс',
		],
		'public'       => true,
		'has_archive'  => false, // Архивная страница назначается через Settings -> Archive pages
		'rewrite'      => ['slug' => 'cases', 'with_front' => false],
		'show_in_rest' => true,
		'menu_icon'    => 'dashicons-portfolio',
		'supports'     => ['title', 'editor', 'excerpt', 'thumbnail', 'page-attributes', 'custom-fields'],
	]);

	/**
	 * ПАТТЕРН 2: Внутренняя коллекция / справочник без собственного URL (как faq / review / tariff)
	 * - public => false, show_ui => true, show_in_rest => true
	 * - Запись редактируется через один фиксированный компонент-блок (template_lock => all)
	 * - Выводится внутри секций через addRelationship() + <Records />
	 */
	register_post_type('team_member', [
		'labels'        => [
			'name'          => 'Команда',
			'singular_name' => 'Сотрудник',
		],
		'public'        => false,
		'show_ui'       => true,
		'show_in_rest'  => true,
		'menu_icon'     => 'dashicons-groups',
		'supports'      => ['title', 'editor', 'page-attributes', 'custom-fields'],
		'template'      => [['site/team-card', []]],
		'template_lock' => 'all',
	]);
});

/**
 * 3. Проброс данных в публичный REST API (/wp-json/site/v1/site):
 * - cards('case_study') вернет массив карточек (id, title, excerpt, imageId, to)
 * - collection_records('team_member') вернет массив записей с полями их внутреннего блока
 */
add_filter('site_public_data', function (array $data): array {
	$data['cases'] = cards('case_study');
	$data['team']  = collection_records('team_member');
	return $data;
});
