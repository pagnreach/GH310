<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LostAndFound extends Model {
    protected $guarded = [];

    public function room(): BelongsTo {
        return $this->belongsTo(Room::class);
    }
}
