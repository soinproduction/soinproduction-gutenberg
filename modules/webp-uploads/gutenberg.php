<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;

trait Gutenberg {
    /** Inspect typed IDs, including the field kit's path → attachment ID map. */
    private function attributes_reference_media(array $value, int $id): bool {
        foreach (['attachment_id','poster_id','imageId','mediaId','image_id','media_id'] as $key) {
            if (isset($value[$key]) && is_scalar($value[$key]) && (int)$value[$key] === $id) return true;
        }
        if (isset($value['__media']) && is_array($value['__media'])) {
            foreach ($value['__media'] as $mediaId) if (is_scalar($mediaId) && (int)$mediaId === $id) return true;
        }
        if (isset($value['id']) && is_scalar($value['id']) && (int)$value['id'] === $id && (isset($value['url']) || isset($value['mime']) || isset($value['alt']))) return true;
        foreach ($value as $child) if (is_array($child) && $this->attributes_reference_media($child, $id)) return true;
        return false;
    }
    private function blocks_reference_media(array $blocks, int $id): bool {
        foreach ($blocks as $block) {
            $attributes = $block['attrs'] ?? [];
            if (in_array($block['blockName'], ['core/image','core/video','core/audio','core/file','core/cover'], true) && (int)($attributes['id'] ?? 0) === $id) return true;
            if ($this->attributes_reference_media($attributes, $id) || $this->blocks_reference_media($block['innerBlocks'] ?? [], $id)) return true;
        }
        return false;
    }
    private function gutenberg_attachment_usage(int $attachmentId): array {
        global $wpdb;
        $cursor = 0;
        do {
            $rows = $wpdb->get_results($wpdb->prepare("SELECT ID, post_content FROM {$wpdb->posts} WHERE ID > %d AND post_content LIKE %s ORDER BY ID ASC LIMIT 200", $cursor, '%<!-- wp:%'), ARRAY_A);
            if ($wpdb->last_error) return ['used'=>true,'source'=>'gutenberg-error','reason'=>'Gutenberg content could not be checked. Kept conservatively.'];
            foreach ($rows as $row) {
                $cursor = (int)$row['ID'];
                if ($this->blocks_reference_media(parse_blocks($row['post_content']), $attachmentId)) return ['used'=>true,'source'=>'gutenberg','reason'=>'Referenced by Gutenberg media fields on record #'.$cursor];
            }
        } while (count($rows) === 200);
        return [];
    }
}
