<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoomSeeder extends Seeder {
    public function run(): void {
        $rooms = [
            // Ground Floor (All Double)
            ['room_number' => 'G1', 'room_type' => 'Double', 'default_rate_usd' => 20.00],
            ['room_number' => 'G2', 'room_type' => 'Double', 'default_rate_usd' => 20.00],
            ['room_number' => 'G3', 'room_type' => 'Double', 'default_rate_usd' => 20.00],
            ['room_number' => 'G4', 'room_type' => 'Double', 'default_rate_usd' => 20.00],
            ['room_number' => 'G5', 'room_type' => 'Double', 'default_rate_usd' => 20.00],

            // 1st Floor (Only 103 is Double)
            ['room_number' => '101', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '102', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '103', 'room_type' => 'Double', 'default_rate_usd' => 20.00],
            ['room_number' => '104', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '105', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '106', 'room_type' => 'Single', 'default_rate_usd' => 15.00],

            // 2nd Floor (Only 203 is Double)
            ['room_number' => '201', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '202', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '203', 'room_type' => 'Double', 'default_rate_usd' => 20.00],
            ['room_number' => '204', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '205', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '206', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '207', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '208', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '209', 'room_type' => 'Single', 'default_rate_usd' => 15.00],

            // 3rd Floor (Only 303 is Double)
            ['room_number' => '301', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '302', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '303', 'room_type' => 'Double', 'default_rate_usd' => 20.00],
            ['room_number' => '304', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '305', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '306', 'room_type' => 'Single', 'default_rate_usd' => 15.00],

            // 4th Floor (Only 403 is Double)
            ['room_number' => '401', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '402', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '403', 'room_type' => 'Double', 'default_rate_usd' => 20.00],
            ['room_number' => '404', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '405', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
            ['room_number' => '406', 'room_type' => 'Single', 'default_rate_usd' => 15.00],
        ];

        foreach ($rooms as $room) {
            DB::table('rooms')->updateOrInsert(
                ['room_number' => $room['room_number']],
                [
                    'room_type' => $room['room_type'],
                    'default_rate_usd' => $room['default_rate_usd'],
                    'updated_at' => now(),
                ]
            );
        }
    }
}
