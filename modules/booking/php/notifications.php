<?php

	namespace SiteTheme\Booking;
	defined( 'ABSPATH' ) || exit;

	function telegram_token() {
		return defined( 'SITE_BOOKING_TELEGRAM_TOKEN' ) ? SITE_BOOKING_TELEGRAM_TOKEN : ( getenv( 'SITE_BOOKING_TELEGRAM_TOKEN' ) ?: '' );
	}

	function notification_settings() {
		return array_replace( [
			'telegram'    => true,
			'username'    => '',
			'admin_chat'  => '',
			'admin_title' => '',
			'email'       => false,
			'from_email'  => '',
			'from_name'   => get_bloginfo( 'name' )
		], (array) get_option( 'site_booking_notifications', [] ) );
	}

	function install_notifications() {
		if ( ! current_user_can( 'manage_options' ) || get_option( 'site_booking_notifications_schema' ) === '2' ) {
			return;
		}
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		dbDelta( 'CREATE TABLE ' . table( 'telegram_links' ) . " (id bigint unsigned NOT NULL AUTO_INCREMENT,
        booking_id bigint unsigned NOT NULL,
        token_hash varchar(64) NOT NULL,
        chat_id bigint NULL,
        username varchar(32) NOT NULL DEFAULT '',
        first_name varchar(100) NOT NULL DEFAULT '',
        last_name varchar(100) NOT NULL DEFAULT '',
        expires_at datetime NOT NULL,
        linked_at datetime NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY booking_id (booking_id),
        UNIQUE KEY token_hash (token_hash),
        KEY chat_id (chat_id)
    ) ENGINE=InnoDB $charset;" );
		dbDelta( 'CREATE TABLE ' . table( 'telegram_replies' ) . " (chat_id bigint NOT NULL,
        message_id bigint NOT NULL,
        booking_id bigint unsigned NOT NULL,
        client_chat bigint NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (chat_id,message_id),
        KEY booking_id (booking_id)
    ) ENGINE=InnoDB $charset;" );
		dbDelta( 'CREATE TABLE ' . table( 'outbox' ) . " (id bigint unsigned NOT NULL AUTO_INCREMENT,
        booking_id bigint unsigned NULL,
        dedupe varchar(64) NOT NULL,
        channel varchar(12) NOT NULL,
        recipient varchar(254) NOT NULL,
        subject varchar(200) NOT NULL DEFAULT '',
        message text NOT NULL,
        buttons text NULL,
        status varchar(16) NOT NULL DEFAULT 'pending',
        attempts int unsigned NOT NULL DEFAULT 0,
        available_at datetime NOT NULL,
        locked_at datetime NULL,
        last_error varchar(200) NOT NULL DEFAULT '',
        created_at datetime NOT NULL,
        sent_at datetime NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY dedupe (dedupe),
        KEY delivery (status,available_at)
    ) ENGINE=InnoDB $charset;" );
		if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', table( 'outbox' ) ) ) === table( 'outbox' ) && $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', table( 'telegram_links' ) ) ) === table( 'telegram_links' ) ) {
			update_option( 'site_booking_notifications_schema', '2', false );
		}
	}

	add_action( 'admin_init', __NAMESPACE__ . '\\install_notifications' );

	function booking_telegram_link( $id ) {
		if ( ! telegram_token() || ! notification_settings()['username'] || ! notification_settings()['telegram'] || get_option('site_booking_notifications_schema')!=='2' ) {
			return '';
		}
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . table( 'bookings' ) . ' WHERE id=%d', $id ) );
		if ( ! $row || $row->type !== 'booking' || $row->status !== 'confirmed' || $row->ends_at <= gmdate( 'Y-m-d H:i:s' ) ) {
			return '';
		}
		$key = substr( hash_hmac( 'sha256', 'telegram:' . $row->token, wp_salt( 'auth' ) ), 0, 48 );
		$wpdb->query( $wpdb->prepare( 'INSERT INTO ' . table( 'telegram_links' ) . ' (booking_id,token_hash,expires_at) VALUES (%d,%s,%s) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at)', $id, hash( 'sha256', $key ), $row->ends_at ) );

		return 'https://t.me/' . rawurlencode( notification_settings()['username'] ) . '?start=b_' . $key;
	}

	function queue_notice( $channel, $recipient, $message, $dedupe, $booking = 0, $buttons = [], $subject = '', $attachment = 0, $attachments = [], $thread = null ) {
		global $wpdb;
		if ( get_option('site_booking_notifications_schema')!=='2' ) {
			return;
		}
		$now = gmdate( 'Y-m-d H:i:s' );
		$ok  = $wpdb->query( $wpdb->prepare( 'INSERT IGNORE INTO ' . table( 'outbox' ) . ' (booking_id,dedupe,channel,recipient,subject,message,buttons,available_at,created_at) VALUES (%d,%s,%s,%s,%s,%s,%s,%s,%s)', $booking, hash( 'sha256', $dedupe ), $channel, (string) $recipient, $subject, $message, wp_json_encode( $buttons ), $now, $now ) );
		if ( $ok === 1 && $thread !== null ) {
			$wpdb->update( table( 'outbox' ), [ 'thread_id' => (int) $thread ], [ 'dedupe' => hash( 'sha256', $dedupe ) ] );
		}
		if ( $ok === 1 && $attachments ) {
			$wpdb->update( table( 'outbox' ), [ 'attachments' => wp_json_encode( array_values( $attachments ) ) ], [ 'dedupe' => hash( 'sha256', $dedupe ) ] );
		}
		if ( $ok === false ) {
			throw new \RuntimeException( 'notification_queue' );
		}
		if ( $ok === 1 && $attachment && get_option('site_booking_chat_schema')==='2' && $wpdb->update( table( 'outbox' ), [ 'attachment_id' => (int) $attachment ], [ 'dedupe' => hash( 'sha256', $dedupe ) ] ) === false ) {
			throw new \RuntimeException( 'notification_attachment' );
		}
	}

	function booking_notice_text( $row, $action ) {
		$title = [
			         'completed'   => t('Бронювання завершено'),
			         'no_show'     => t('Клієнт не прийшов'),
			         'created'     => t('Бронювання підтверджено'),
			         'rescheduled' => t('Бронювання перенесено'),
			         'cancelled'   => t('Бронювання скасовано'),
			         'reminder'    => t('Нагадування про бронювання')
		         ][ $action ] ?? t('Оновлення бронювання');

		return $title . ' №' . $row->id . "\n" . $row->shoot_type . "\n" . display_time( $row->starts_at ) . '–' . display_time( $row->ends_at, 'H:i' ) . ' ('.(config('timezone_label') ?: zone()->getName()).')' . t("\nТривалість: ") . $row->hours . t(' год') . t("\nВартість: ") . number_format( $row->amount / 100, 2, ',', ' ' ) . t(' грн') . ( $row->payment_mode === 'unpaid' ? t("\nБез оплати — оплату не проводили.") : '' );
	}

	function booking_rules_text() {
		return trim( (string) settings()['rules'] );
	}

	function queue_booking_rules( $id, $chat ) {
		$rules = booking_rules_text();
		if ( ! $rules || ! $chat ) {
			return;
		}
		$length = mb_strlen( $rules );
		for ( $offset = 0, $part = 0; $offset < $length; $offset += 3500, $part ++ ) {
			queue_notice( 'telegram', $chat, t('Правила студії · бронювання №') . $id . "\n\n" . mb_substr( $rules, $offset, 3500 ), 'rules:' . $id . ':' . $chat . ':' . $part, $id );
		}
	}

	/** Called inside the booking transaction. No network requests here. */
	function queue_booking_notice( $id, $action ) {
		if ( ! apply_filters( 'site_booking_notifications_enabled', true ) || get_option('site_booking_notifications_schema')!=='2' || ! in_array( $action, [
				'created',
				'rescheduled',
				'cancelled',
				'completed',
				'no_show'
			], true ) ) {
			return;
		}
		global $wpdb;
		$row = telegram_booking_row( $id );
		if ( ! $row || $row->type !== 'booking' ) {
			return;
		}
		if ( $action === 'rescheduled' ) {
			$wpdb->update( table( 'telegram_links' ), [ 'expires_at' => $row->ends_at ], [ 'booking_id' => $id ] );
		}
		$event    = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT MAX(id) FROM ' . table( 'events' ) . ' WHERE booking_id=%d', $id ) );
		$settings = notification_settings();
		$message  = booking_notice_text( $row, $action );
		if ( $settings['telegram'] && telegram_token() ) {
			if ( $settings['admin_chat'] ) {
				queue_notice( 'telegram', $settings['admin_chat'], $message . t("\nКлієнт: ") . $row->name . t("\nТелефон: ") . $row->phone, 'event:' . $event . ':admin', $id, telegram_admin_buttons( $row ), $action );
			}
			$chat = $wpdb->get_var( $wpdb->prepare( 'SELECT chat_id FROM ' . table( 'telegram_links' ) . ' WHERE booking_id=%d', $id ) );
			if ( $chat && $action !== 'no_show' ) {
				queue_notice( 'telegram', $chat, $message, 'event:' . $event . ':client', $id, telegram_client_buttons( $row, $chat ) );
				if ( $action === 'created' ) {
					queue_booking_rules( $id, $chat );
				}
			}
		}
		if ( $settings['email'] && $action !== 'no_show' ) {
			$payload = json_decode( $wpdb->get_var( $wpdb->prepare( "SELECT payload FROM " . table( 'events' ) . " WHERE booking_id=%d AND action='created' ORDER BY id LIMIT 1", $id ) ), true );
			if ( is_email( $payload['email'] ?? '' ) ) {
				queue_notice( 'email', $payload['email'], $message . ( $action === 'created' && booking_rules_text() ? t("\n\nПравила студії\n") . booking_rules_text() : '' ) . "\n\n" . booking_telegram_link( $id ), 'event:' . $event . ':email', $id, [], t('Бронювання студії №') . $id );
			}
		}
	}

	function telegram_style_markup( $markup ) {
		if ( ! isset( $markup['inline_keyboard'] ) ) {
			return $markup;
		}
		foreach ( $markup['inline_keyboard'] as &$row ) {
			foreach ( $row as &$button ) {
				$parts = explode( '|', $button['callback_data'] ?? '' );
				$style = [
					         'm' => 'primary',
					         's' => 'primary',
					         'y' => 'success',
					         'c' => 'danger',
					         'x' => 'danger'
				         ][ $parts[3] ?? '' ] ?? null;
				if ( $style ) {
					$button['style'] = $style;
				}
			}
		}
		unset( $row, $button );

		return $markup;
	}

	function telegram_api( $method, $data, $retry = true ) {
		if ( isset( $data['reply_markup'] ) && is_array( $data['reply_markup'] ) ) {
			$data['reply_markup'] = telegram_style_markup( $data['reply_markup'] );
		}
		if ( ! telegram_token() ) {
			return error( 'telegram_unconfigured', t('Токен бота не налаштовано.'), 503 );
		}
		$response = wp_remote_post( 'https://api.telegram.org/bot' . telegram_token() . '/' . $method, [
			'timeout'     => $method === 'getUpdates' ? 30 : 12,
			'body'        => wp_json_encode( $data ),
			'headers'     => [ 'Content-Type' => 'application/json' ],
			'redirection' => 0
		] );
		if ( is_wp_error( $response ) ) {
			return error( 'telegram_network', t('Telegram тимчасово недоступний.'), 503 );
		}
		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $body['ok'] ) && $retry && ! empty( $body['parameters']['migrate_to_chat_id'] ) && isset( $data['chat_id'] ) ) {
			telegram_migrate_group( (string) $data['chat_id'], (string) $body['parameters']['migrate_to_chat_id'] );
			$data['chat_id'] = (string) $body['parameters']['migrate_to_chat_id'];
			if ( isset( $data['reply_markup']['inline_keyboard'] ) ) {
				$data['reply_markup']['inline_keyboard'] = array_map( __NAMESPACE__ . '\\telegram_resign_buttons', $data['reply_markup']['inline_keyboard'] );
			}

			return telegram_api( $method, $data, false );
		}
		if ( empty( $body['ok'] ) ) {
			return new \WP_Error( 'telegram_api', 'Telegram: ' . substr( str_replace( telegram_token(), '[redacted]', sanitize_text_field( $body['description'] ?? t('Помилка API') ) ), 0, 160 ), [ 'status' => (int) ( $body['error_code'] ?? 502 ), 'retry_after' => (int) ( $body['parameters']['retry_after'] ?? 0 ) ] );
		}

		return $body['result'];
	}

	function notification_worker() {
		global $wpdb;
		if ( get_option('site_booking_notifications_schema')!=='2' ) {
			return;
		}
		// An atomic lease keeps cron and the CLI worker from delivering the same job concurrently.
		$lease = (int) get_option( 'site_booking_delivery_lock', 0 );
		if ( $lease && $lease < time() - 180 ) {
			delete_option( 'site_booking_delivery_lock' );
		}
		if ( ! add_option( 'site_booking_delivery_lock', time(), '', 'no' ) ) {
			return;
		}
		try {
			$wpdb->query( 'UPDATE ' . table( 'outbox' ) . " SET status=IF(attempts>=6,'failed','pending'),last_error=IF(attempts>=6,'Доставку перервано',last_error) WHERE status='sending' AND locked_at < UTC_TIMESTAMP() - INTERVAL 3 MINUTE" );
			$settings = notification_settings();
			// Disabled channels stay queued but must not fill the batch and starve active ones.
			$channels = array_keys( array_filter( [ 'telegram' => $settings['telegram'] && telegram_token(), 'email' => $settings['email'] ] ) );
			if ( ! $channels ) {
				return;
			}
			$jobs = $wpdb->get_results( 'SELECT * FROM ' . table( 'outbox' ) . " WHERE status='pending' AND available_at<=UTC_TIMESTAMP() AND channel IN ('" . implode( "','", $channels ) . "') ORDER BY COALESCE(booking_id,0)=0,id LIMIT 8" );
			foreach ( $jobs as $job ) {
				$settings = notification_settings();
				$claimed = $wpdb->query( $wpdb->prepare( "UPDATE " . table( 'outbox' ) . " SET status='sending',attempts=attempts+1,locked_at=UTC_TIMESTAMP() WHERE id=%d AND status='pending'", $job->id ) );
				if ( $claimed !== 1 ) {
					continue;
				}
				update_option( 'site_booking_delivery_lock', time(), false );
				$thread = 0;
				try {
				if ( $job->channel === 'telegram' ) {
					$data    = [ 'chat_id' => $job->recipient, 'text' => $job->message ];
					$buttons = array_values( array_filter( json_decode( $job->buttons, true ) ?: [], fn( $button ) => ! empty( $button['callback_data'] ) || ( str_contains( (string) wp_parse_url( $button['url'] ?? '', PHP_URL_HOST ), '.' ) && wp_http_validate_url( $button['url'] ?? '' ) ) ) );
					if ( (string) $job->recipient === (string) $settings['admin_chat'] ) {
						$buttons = telegram_resign_buttons( $buttons );
					}
					if ( $buttons ) {
						$data['reply_markup'] = [ 'inline_keyboard' => array_chunk( $buttons, 1 ) ];
					}
					if ( isset( $data['reply_markup'] ) ) {
						$data['reply_markup'] = telegram_style_markup( $data['reply_markup'] );
					}
					$thread = ! empty( $job->thread_id ) ? (int) $job->thread_id : telegram_booking_topic( (int) $job->booking_id, $job->recipient );
					if ( ! is_wp_error( $thread ) && $thread > 1 && (string) $job->recipient === (string) $settings['admin_chat'] ) {
						$buttons = telegram_topic_buttons( $buttons, $thread );
						if ( $buttons ) {
							$data['reply_markup'] = [ 'inline_keyboard' => array_chunk( $buttons, 1 ) ];
						} else {
							unset( $data['reply_markup'] );
						}
					}
					// General is addressed without message_thread_id; Telegram rejects an explicit 1.
					if ( ! is_wp_error( $thread ) && $thread > 1 ) {
						$data['message_thread_id'] = $thread;
					}
					if ( isset( $data['reply_markup'] ) ) {
						$data['reply_markup'] = telegram_style_markup( $data['reply_markup'] );
					}
					$result = is_wp_error( $thread ) ? $thread : ( ! empty( $job->attachments ) ? chat_send_album( $job, $data ) : ( ! empty( $job->attachment_id ) ? chat_send_attachment( $job, $data ) : telegram_api( 'sendMessage', $data ) ) );
				} else {
					$headers = [ 'Content-Type: text/plain; charset=UTF-8' ];
					if ( is_email( $settings['from_email'] ) ) {
						$headers[] = 'From: ' . sanitize_text_field( $settings['from_name'] ) . ' <' . $settings['from_email'] . '>';
					}
					$result = wp_mail( $job->recipient, $job->subject, $job->message, $headers ) ? true : error( 'email_send', t('Поштовий транспорт не прийняв лист.'), 503 );
				}
				} catch ( \Throwable $exception ) {
					log_failure( 'delivery', $exception );
					$result = error( 'delivery_exception', t('Внутрішня помилка надсилання.'), 503 );
				}
				// The message has left: follow-up failures must not requeue and duplicate it.
				try {
				if ( ! is_wp_error( $result ) && $job->channel === 'telegram' && $job->booking_id ) {
					telegram_queue_booking_summary( $job, $thread );
				}
				if ( ! is_wp_error( $result ) && $job->channel === 'telegram' && $job->booking_id && (string) $job->recipient === (string) $settings['admin_chat'] && empty( $job->thread_id ) && in_array( $job->subject, [ 'created', 'rescheduled', 'cancelled', 'completed', 'no_show' ], true ) ) {
					telegram_topic_card( $job->booking_id, $job->recipient, $thread, $result['message_id'] ?? 0 );
				}
				if ( ! is_wp_error( $result ) && $job->channel === 'telegram' && $job->booking_id ) {
					foreach ( isset( $result['message_id'] ) ? [ $result ] : $result as $sent_message ) {
						if ( ! empty( $sent_message['message_id'] ) ) {
							telegram_support_route( $sent_message['chat']['id'] ?? $job->recipient, $sent_message['message_id'], $job->booking_id );
						}
					}
				}
				} catch ( \Throwable $exception ) {
					log_failure( 'delivery_followup', $exception );
				}
				$failed    = is_wp_error( $result );
				$retry_after = $failed ? (int) ( $result->get_error_data()['retry_after'] ?? 0 ) : 0;
				// Telegram throttling says nothing about this job, so it does not consume an attempt.
				$attempts  = (int) $job->attempts + ( $retry_after ? 0 : 1 );
				$permanent = $failed && in_array( (int) ( $result->get_error_data()['status'] ?? 0 ), [
						400,
						403
					], true );
				$wpdb->update( table( 'outbox' ), [
					'status'       => $failed ? ( $permanent || $attempts >= 6 ? 'failed' : 'pending' ) : 'sent',
					'sent_at'      => $failed ? null : gmdate( 'Y-m-d H:i:s' ),
					'attempts'     => $attempts,
					'available_at' => gmdate( 'Y-m-d H:i:s', time() + ( $retry_after ?: min( 3600, 30 * 2 ** $attempts ) ) ),
					'last_error'   => $failed ? $result->get_error_message() : ''
				], [ 'id' => $job->id ] );
				if ( $retry_after ) {
					break;
				}
			}
		} finally {
			delete_option( 'site_booking_delivery_lock' );
		}
	}

	function handle_telegram_update( $update ) {
		if ( ! telegram_update_allowed( $update ) ) {
			return;
		}
		if ( isset( $update['callback_query'] ) ) {
			if ( str_starts_with( $update['callback_query']['data'] ?? '', 'cl|' ) ) {
				handle_telegram_client_callback( $update['callback_query'] );
			} else {
				handle_telegram_callback( $update['callback_query'] );
			}

			return;
		}
		global $wpdb;
		$message = $update['message'] ?? [];
		$chat    = (string) ( $message['chat']['id'] ?? '' );
		$text    = trim( $message['text'] ?? '' );
		$private = ( $message['chat']['type'] ?? '' ) === 'private';
		if ( ! $chat || ! notification_settings()['telegram'] ) {
			return;
		}
		if ( ! empty( $message['migrate_to_chat_id'] ) ) {
			telegram_migrate_group( $chat, (string) $message['migrate_to_chat_id'] );

			return;
		}
		if ( ! empty( $message['migrate_from_chat_id'] ) ) {
			telegram_migrate_group( (string) $message['migrate_from_chat_id'], $chat );

			return;
		}
		$update_id = (string) ( $update['update_id'] ?? '' );
		$reply     = function ( $text, $suffix = 'reply', $booking = 0, $buttons = [] ) use ( $chat, $update_id ) {
			queue_notice( 'telegram', $chat, $text, 'update:' . $update_id . ':' . $suffix, $booking, $buttons );
		};
		if ( preg_match( '/^\/connect(?:@\w+)?\s+([a-f0-9]{40})$/D', $text, $match ) ) {
			$pending = get_option( 'site_booking_telegram_connect', [] );
			if ( $private || ! in_array( $message['chat']['type'] ?? '', [
					'group',
					'supergroup'
				], true ) || empty( $pending['hash'] ) || ( $pending['expires'] ?? 0 ) < time() || ! hash_equals( $pending['hash'], hash( 'sha256', $match[1] ) ) ) {
				$reply( t('Посилання недійсне. Створіть новий код у налаштуваннях сайту.') );

				return;
			}
			$settings                = notification_settings();
			$settings['admin_chat']  = $chat;
			$settings['admin_title'] = sanitize_text_field( $message['chat']['title'] ?? t('Група студії') );
			update_option( 'site_booking_notifications', $settings, false );
			delete_option( 'site_booking_telegram_connect' );
			$reply( t('Групу підключено. Тут будуть повідомлення про бронювання.') );

			return;
		}
		if ( $private && (string) ( $message['from']['id'] ?? $chat ) === $chat ) {
			save_telegram_profile( $chat, $message['from'] ?? $message['chat'] );
		}
		if ( telegram_support_message( $message, $update_id ) ) {
			return;
		}
		if ( ! $private ) {
			return;
		}
		if ( in_array( $text, [ '/bookings', '/start' ], true ) ) {
			telegram_client_bookings( $chat, $update_id );

			return;
		}
		if ( preg_match( '/^\/start\s+b_([a-f0-9]{48})$/D', $text, $match ) ) {
			if ( $wpdb->query( 'START TRANSACTION' ) === false ) {
				throw new \RuntimeException( 'telegram_transaction' );
			}
			try {
				$link = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . table( 'telegram_links' ) . ' WHERE token_hash=%s FOR UPDATE', hash( 'sha256', $match[1] ) ) );
				if ( ! $link || $link->expires_at < gmdate( 'Y-m-d H:i:s' ) || ( $link->chat_id && (string) $link->chat_id !== $chat ) ) {
					$reply( t('Посилання недійсне, прострочене або вже використане.') );
				} else {
					$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . table( 'bookings' ) . ' WHERE id=%d', $link->booking_id ) );
					if ( ! $row || $row->status !== 'confirmed' ) {
						$reply( t('Це бронювання вже скасовано або недоступне.') );
					} else {
						if ( $wpdb->update( table( 'telegram_links' ), [
								'chat_id'   => $chat,
								'linked_at' => gmdate( 'Y-m-d H:i:s' )
							], [ 'id' => $link->id ] ) === false ) {
							throw new \RuntimeException( 'telegram_link' );
						}
						save_telegram_profile( $chat, $message['from'] ?? $message['chat'] );
						$reply( t("Сповіщення підключено.\n\n") . booking_notice_text( $row, 'created' ), 'linked', $row->id, telegram_client_buttons( $row, $chat ) );
						queue_booking_rules( $row->id, $chat );
					}
				}
				if ( $wpdb->query( 'COMMIT' ) === false ) {
					throw new \RuntimeException( 'telegram_commit' );
				}
			} catch ( \Throwable $e ) {
				$wpdb->query( 'ROLLBACK' );
				throw $e;
			}

			return;
		}
		if ( $text === '/stop' ) {
			delete_transient( 'site_booking_support_' . hash( 'sha256', $chat ) );
			$wpdb->query( $wpdb->prepare( 'UPDATE ' . table( 'outbox' ) . " SET status='cancelled' WHERE channel='telegram' AND recipient=%s AND status='pending'", $chat ) );
			$wpdb->query( $wpdb->prepare( 'UPDATE ' . table( 'telegram_links' ) . ' SET chat_id=NULL,linked_at=NULL WHERE chat_id=%s', $chat ) );
			$reply( t('Сповіщення вимкнено. Для підключення знову відкрийте посилання з підтвердження бронювання.') );

			return;
		}
		if ( ! rate_limit( 'telegram-greeting:' . $chat, 1, 10 * MINUTE_IN_SECONDS ) ) {
			return;
		}
		$reply( t("Вітаємо у студії!\nЩоб отримувати сповіщення, відкрийте персональне посилання після бронювання на сайті.\n/bookings — мої бронювання\n/stop — вимкнути сповіщення\n/help — допомога") );
	}

	function telegram_poll( $timeout = 0 ) {
		if ( ! telegram_token() || ! notification_settings()['telegram'] ) {
			return;
		}
		$lease = (int) get_option( 'site_booking_poll_lock', 0 );
		if ( $lease && $lease < time() - 90 ) {
			delete_option( 'site_booking_poll_lock' );
		}
		if ( ! add_option( 'site_booking_poll_lock', time(), '', 'no' ) ) {
			return;
		}
		try {
			$result = telegram_api( 'getUpdates', [
				'offset'          => (int) get_option( 'site_booking_telegram_offset', 0 ),
				'timeout'         => $timeout,
				'limit'           => 100,
				'allowed_updates' => [ 'message', 'callback_query' ]
			] );
			if ( is_wp_error( $result ) ) {
				update_option( 'site_booking_telegram_health', [
					'time'  => time(),
					'error' => $result->get_error_message()
				], false );

				return;
			}
			foreach ( $result as $update ) {
				update_option( 'site_booking_poll_lock', time(), false );
				// One unprocessable update must not stop every later one.
				try {
					handle_telegram_update( $update );
				} catch ( \Throwable $exception ) {
					log_failure( 'telegram_update', $exception );
				}
				update_option( 'site_booking_telegram_offset', (int) $update['update_id'] + 1, false );
			}
			update_option( 'site_booking_telegram_health', [ 'time' => time(), 'error' => '' ], false );
		} finally {
			delete_option( 'site_booking_poll_lock' );
		}
	}

	add_filter( 'cron_schedules', function ( $schedules ) {
		$schedules['site_booking_minute'] = [ 'interval' => 60, 'display' => t('Щохвилини') ];

		return $schedules;
	} );
	add_action( 'init', function () {
		if ( get_option('site_booking_notifications_schema')==='2' && ! wp_next_scheduled( 'site_booking_notifications_tick' ) ) {
			wp_schedule_event( time() + 60, 'site_booking_minute', 'site_booking_notifications_tick' );
		}
	} );
	add_action( 'site_booking_notifications_tick', function () {
		telegram_poll();
		queue_scheduled_notices();
		notification_worker();
	} );

	if ( defined( 'WP_CLI' ) && WP_CLI ) {
		\WP_CLI::add_command( 'site-booking telegram-run', function ( $args, $assoc ) {
			if ( ! telegram_token() ) {
				\WP_CLI::error( t('Токен бота не налаштовано.') );
			}
			do {
				wp_cache_delete( 'alloptions', 'options' );
				wp_cache_delete( 'notoptions', 'options' );
				foreach (
					[
						'site_booking_notifications',
						'site_booking_delivery_lock',
						'site_booking_poll_lock',
						'site_booking_telegram_offset',
						'site_booking_telegram_connect'
					] as $option
				) {
					wp_cache_delete( $option, 'options' );
				}
				complete_due_bookings();
				telegram_poll( isset( $assoc['once'] ) ? 0 : 15 );
				queue_scheduled_notices();
				notification_worker();
				if ( ! isset( $assoc['once'] ) ) {
					sleep( empty( get_option( 'site_booking_telegram_health', [] )['error'] ) ? 1 : 15 );
				}
			} while ( ! isset( $assoc['once'] ) );
			\WP_CLI::success( 'Telegram cycle completed.' );
		} );
	}
