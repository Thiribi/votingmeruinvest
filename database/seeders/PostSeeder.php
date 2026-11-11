<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\PostLike;
use App\Models\User;
use Illuminate\Database\Seeder;

class PostSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::where('user_classification', 'citizen')->get();

        if ($users->isEmpty()) {
            return;
        }

        $posts = [
            "Just cast my vote for the FansBench Music Awards \u{1F3B6} — every vote is verified, no bots here!",
            'Excited to see how close the Sports Personality of the Year race is this season.',
            'Reminder: dual-OTP verification takes 30 seconds and keeps the rankings honest for everyone.',
            'Shoutout to everyone showing up and voting for their favourite creators this month!',
        ];

        foreach ($posts as $i => $body) {
            $author = $users[$i % $users->count()];

            $post = Post::firstOrCreate(
                ['user_id' => $author->id, 'body' => $body],
                ['likes_count' => 0, 'comments_count' => random_int(0, 6)]
            );

            foreach ($users->random(min(2, $users->count())) as $liker) {
                $like = PostLike::firstOrCreate(['post_id' => $post->id, 'user_id' => $liker->id]);

                if ($like->wasRecentlyCreated) {
                    $post->increment('likes_count');
                }
            }
        }
    }
}
