<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateInviteRequest;
use App\Http\Requests\StoreCampaignRequest;
use App\Http\Requests\UpdateCampaignRequest;
use App\Http\Resources\CampaignResource;
use App\Models\AuditLog;
use App\Models\Campaign;
use App\Models\CampaignAccessToken;
use App\Models\CampaignOption;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CampaignController extends Controller
{
    public function index(Request $request)
    {
        $campaigns = Campaign::query()
            ->with(['organization', 'category', 'options.nominee.subcategory:id,slug'])
            ->when($request->filled('organization_id'), fn ($q) => $q->where('organization_id', $request->input('organization_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('visibility'), fn ($q) => $q->where('visibility', $request->input('visibility')))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return CampaignResource::collection($campaigns);
    }

    public function show(Request $request, Campaign $campaign)
    {
        if ($campaign->isPrivate()) {
            $token = $request->query('token');

            if (! $token) {
                throw new HttpException(403, 'This campaign requires an invite link.');
            }

            $accessToken = CampaignAccessToken::where('campaign_id', $campaign->id)
                ->where('token_hash', hash('sha256', $token))
                ->first();

            if (! $accessToken || ! $accessToken->isUsable()) {
                throw new HttpException(403, 'Invalid or expired invite link.');
            }
        }

        return new CampaignResource($campaign->load(['organization', 'category', 'options.nominee.subcategory:id,slug']));
    }

    public function store(StoreCampaignRequest $request)
    {
        $data = $request->validated();

        $campaign = Campaign::create([
            'organization_id' => $data['organization_id'] ?? null,
            'category_label' => $data['category'] ?? null,
            'created_by_user_id' => $request->user()?->id,
            'title' => $data['title'],
            'visibility' => $data['visibility'],
            'status' => 'live',
            'starts_at' => $data['starts_at'] ?? null,
            'closes_at' => $data['closes_at'] ?? null,
            'feedback_options' => ! empty($data['feedback_options']) ? array_values($data['feedback_options']) : null,
        ]);

        foreach ($data['options'] as $option) {
            CampaignOption::create([
                'campaign_id' => $campaign->id,
                'label' => $option['label'],
                'description' => $option['description'] ?? null,
            ]);
        }

        $invites = [];

        if ($campaign->visibility === 'private') {
            // One unique, single-use link per allow-listed member. The plaintext token is
            // only knowable at creation (we persist just its hash), so every link the admin
            // needs to distribute is returned here and nowhere else.
            foreach ($data['allowed_emails'] ?? [] as $email) {
                $invites[] = [
                    'email' => $email,
                    'invite_url' => $this->createAccessToken($campaign, $email),
                ];
            }
        }

        $campaign->invites = $invites;
        $campaign->invite_url = $invites[0]['invite_url'] ?? null;

        AuditLog::record($request->user(), 'campaign.published', "Published campaign \"{$campaign->title}\"", $campaign);

        return new CampaignResource($campaign->load(['organization', 'category', 'options', 'accessTokens']));
    }

    public function update(UpdateCampaignRequest $request, Campaign $campaign)
    {
        $data = $request->validated();

        if (array_key_exists('category', $data)) {
            $data['category_label'] = $data['category'];
            unset($data['category']);
        }

        $wasLive = $campaign->status === 'live';

        $campaign->update($data);

        if (! $wasLive && $campaign->status === 'live') {
            AuditLog::record($request->user(), 'campaign.published', "Published campaign \"{$campaign->title}\"", $campaign);
        }

        return new CampaignResource($campaign->load(['organization', 'category', 'options', 'accessTokens']));
    }

    public function destroy(Campaign $campaign)
    {
        $campaign->delete();

        return response()->json(['ok' => true]);
    }

    /** Geo-tagged post-vote feedback for a campaign, newest first, surfaced to the org/admins. */
    public function feedback(Campaign $campaign)
    {
        $rows = $campaign->votes()
            ->whereNotNull('feedback')
            ->with('county:id,name')
            ->latest()
            ->limit(200)
            ->get()
            ->map(function ($vote) {
                $lat = $vote->latitude !== null ? (float) $vote->latitude : null;
                $lng = $vote->longitude !== null ? (float) $vote->longitude : null;

                return [
                    'id' => $vote->id,
                    'feedback' => $vote->feedback,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'map_url' => $lat !== null && $lng !== null
                        ? "https://www.google.com/maps?q={$lat},{$lng}"
                        : null,
                    'county' => $vote->county?->name,
                    'created_at' => $vote->created_at?->toISOString(),
                ];
            });

        return response()->json(['data' => $rows]);
    }

    public function generateInvite(GenerateInviteRequest $request, Campaign $campaign)
    {
        if (! $campaign->isPrivate()) {
            throw new HttpException(422, 'Only private campaigns support invite links.');
        }

        $data = $request->validated();

        $email = $data['email'] ?? $campaign->organization?->contact_email ?? 'invite@fansbench.local';
        $inviteUrl = $this->createAccessToken($campaign, $email);

        return response()->json([
            'invite_url' => $inviteUrl,
            'token' => Str::after($inviteUrl, 'token='),
        ]);
    }

    private function createAccessToken(Campaign $campaign, string $email): string
    {
        $plaintext = Str::random(40);

        CampaignAccessToken::create([
            'campaign_id' => $campaign->id,
            'email' => $email,
            'token_hash' => hash('sha256', $plaintext),
            'expires_at' => now()->addDays(7),
        ]);

        // Built from APP_URL (the public, environment-defined base URL) rather than
        // FRONTEND_URL — in production FRONTEND_URL points at the internal Node proxy
        // (127.0.0.1:3010) and would produce links no external recipient could open.
        return rtrim(config('app.url'), '/')."/campaign/{$campaign->id}?token={$plaintext}";
    }
}
