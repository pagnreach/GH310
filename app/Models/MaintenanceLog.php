<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceLog extends Model {
    protected $guarded = [];

    public function room(): BelongsTo {
        return $this->belongsTo(Room::class);
    }
}
