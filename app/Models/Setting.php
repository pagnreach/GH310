<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model {
    protected $fillable = ['key', 'value'];

    public static function get(string $key, $default = null) {
        $setting = static::where('key', $key)->first();
        if (!$setting) return $default;

        $decoded = json_decode($setting->value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $setting->value;
    }

    public static function set(string $key, $value): void {
        $val = is_array($value) ? json_encode($value) : (string)$value;
        static::updateOrCreate(['key' => $key], ['value' => $val]);
    }
}
