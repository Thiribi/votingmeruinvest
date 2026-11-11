<?php

use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\FraudController;
use App\Http\Controllers\Api\Admin\PermissionController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Api\Admin\SmsCredentialController;
use App\Http\Controllers\Api\Admin\StatsController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\VoteMapController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\GeographyController;
use App\Http\Controllers\Api\GuestVoteController;
use App\Http\Controllers\Api\NomineeController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\PublicStatsController;
use App\Http\Controllers\Api\SavedLocationController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SubcategoryController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\VoteController;
use Illuminate\Support\Facades\Route;

/* ---------------- Auth ---------------- */
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/auth/resend-otp', [AuthController::class, 'resendOtp']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/location', [AuthController::class, 'saveLocation']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::post('/auth/request-deletion', [AuthController::class, 'requestDeletion']);
});

/* ---------------- Feed ---------------- */
Route::get('/feed', [FeedController::class, 'index']);
Route::get('/feed/{post}/comments', [CommentController::class, 'index']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/feed', [FeedController::class, 'store']);
    Route::post('/feed/{post}/like', [FeedController::class, 'like']);
    Route::delete('/feed/{post}/like', [FeedController::class, 'unlike']);
    Route::post('/feed/{post}/comments', [CommentController::class, 'store']);
});

/* ---------------- Conversations (fan-started chat threads) ---------------- */
Route::get('/conversations', [ConversationController::class, 'index']);
Route::get('/conversations/{conversation}', [ConversationController::class, 'show']);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/conversations', [ConversationController::class, 'store']);
    Route::post('/conversations/{conversation}/messages', [ConversationController::class, 'postMessage']);
});

/* ---------------- Public stats (landing page) ---------------- */
Route::get('/stats', [PublicStatsController::class, 'index']);

/* ---------------- Universal search ---------------- */
Route::get('/search', SearchController::class);

/* ---------------- Categories ---------------- */
Route::get('/categories/board', [CategoryController::class, 'board']); // must precede {idOrSlug}
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{idOrSlug}', [CategoryController::class, 'show']);

/* ---------------- Nominees ---------------- */
Route::get('/nominees/leaderboard', [NomineeController::class, 'leaderboard']);
Route::get('/nominees/trending', [NomineeController::class, 'trending']);
Route::get('/nominees', [NomineeController::class, 'index']);
Route::get('/nominees/{nominee}', [NomineeController::class, 'show']);

/* ---------------- Organizations ---------------- */
Route::get('/organizations', [OrganizationController::class, 'index']);
Route::get('/organizations/{organization}', [OrganizationController::class, 'show']);

/* ---------------- Campaigns ---------------- */
Route::get('/campaigns', [CampaignController::class, 'index']);
Route::get('/campaigns/{campaign}', [CampaignController::class, 'show']);

/* ---------------- Voting (private/invite-token campaigns only) ---------------- */
Route::post('/votes', [VoteController::class, 'cast']);

/* ---------------- Guest voting (no account; phone OTP + M-Pesa) ---------------- */
Route::post('/guest/vote/otp', [GuestVoteController::class, 'sendOtp']);
Route::post('/guest/vote', [GuestVoteController::class, 'cast']);
Route::get('/guest/vote/status', [GuestVoteController::class, 'status']);
Route::post('/guest/vote/feedback', [GuestVoteController::class, 'submitFeedback']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/votes/mine', [VoteController::class, 'mine']);

    /* ---------------- Cart (public/logged-in citizen voting) ---------------- */
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'addItem']);
    Route::delete('/cart/items/{item}', [CartController::class, 'removeItem']);
    Route::post('/cart/checkout', [CartController::class, 'checkout']);
    Route::get('/cart/checkout/verify', [CartController::class, 'verifyCheckout']);
    Route::post('/cart/feedback', [CartController::class, 'submitFeedback']);

    /* ---------------- Saved locations (logged-in citizens) ---------------- */
    Route::get('/saved-locations', [SavedLocationController::class, 'index']);
    Route::post('/saved-locations', [SavedLocationController::class, 'store']);
    Route::put('/saved-locations/{savedLocation}', [SavedLocationController::class, 'update']);
    Route::delete('/saved-locations/{savedLocation}', [SavedLocationController::class, 'destroy']);
});

/* ---------------- Geography (location picker) ---------------- */
Route::get('/counties', [GeographyController::class, 'counties']);
Route::get('/counties/{county}/subcounties', [GeographyController::class, 'subcounties']);
Route::get('/subcounties/{subcounty}/wards', [GeographyController::class, 'wards']);

/* ---------------- Contact ---------------- */
Route::post('/contact', [ContactController::class, 'send']);

/* ---------------- M-Pesa webhook ---------------- */
Route::post('/webhooks/mpesa/{secret}', [PaymentWebhookController::class, 'mpesa']);

/* ---------------- Admin / management (auth required; each route further gated by role/permission below) ---------------- */
Route::middleware(['auth:sanctum'])->group(function () {
    // Shared by the category/subcategory/nominee (and any future) admin image pickers;
    // the actual write to a protected record still goes through that record's own
    // permission-gated store/update route below.
    Route::post('/uploads/images', [UploadController::class, 'store']);

    Route::middleware('permission:categories.manage')->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::post('/categories/{category}/archive', [CategoryController::class, 'archive']);
        Route::post('/categories/{category}/unarchive', [CategoryController::class, 'unarchive']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
    });

    Route::middleware('permission:subcategories.manage')->group(function () {
        Route::post('/categories/{category}/subcategories', [SubcategoryController::class, 'store']);
        Route::put('/subcategories/{subcategory}', [SubcategoryController::class, 'update']);
        Route::post('/subcategories/{subcategory}/archive', [SubcategoryController::class, 'archive']);
        Route::post('/subcategories/{subcategory}/unarchive', [SubcategoryController::class, 'unarchive']);
        Route::delete('/subcategories/{subcategory}', [SubcategoryController::class, 'destroy']);
    });

    Route::middleware('permission:nominees.manage')->group(function () {
        Route::post('/subcategories/{subcategory}/nominees', [NomineeController::class, 'store']);
        Route::post('/nominees/{nominee}/duplicate', [NomineeController::class, 'duplicate']);
        Route::put('/nominees/{nominee}', [NomineeController::class, 'update']);
        Route::post('/nominees/{nominee}/archive', [NomineeController::class, 'archive']);
        Route::post('/nominees/{nominee}/unarchive', [NomineeController::class, 'unarchive']);
        Route::delete('/nominees/{nominee}', [NomineeController::class, 'destroy']);
    });

    Route::middleware('permission:orgs.manage')->group(function () {
        Route::post('/organizations', [OrganizationController::class, 'store']);
        Route::put('/organizations/{organization}', [OrganizationController::class, 'update']);
        Route::delete('/organizations/{organization}', [OrganizationController::class, 'destroy']);
    });

    Route::middleware('permission:campaigns.create')->group(function () {
        Route::post('/campaigns', [CampaignController::class, 'store']);
        Route::post('/campaigns/{campaign}/invite', [CampaignController::class, 'generateInvite']);
    });
    Route::middleware('permission:campaigns.publish')->group(function () {
        Route::put('/campaigns/{campaign}', [CampaignController::class, 'update']);
        Route::delete('/campaigns/{campaign}', [CampaignController::class, 'destroy']);
        Route::get('/campaigns/{campaign}/feedback', [CampaignController::class, 'feedback']);
    });

    Route::middleware('admin')->group(function () {
        Route::get('/admin/stats', [StatsController::class, 'index']);
        Route::get('/admin/stats/series', [StatsController::class, 'series']);
        Route::get('/admin/stats/organizations', [StatsController::class, 'organizations']);
        Route::get('/admin/transactions', [StatsController::class, 'transactions']);
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);
        Route::delete('/admin/users/{user}', [AdminUserController::class, 'destroy']);
    });

    Route::middleware('permission:users.view')->group(function () {
        Route::get('/admin/users', [AdminUserController::class, 'index']);
    });
    Route::middleware('permission:reports.view')->group(function () {
        Route::get('/admin/reports/votes', [ReportController::class, 'votes']);
        Route::get('/admin/reports/votes/export', [ReportController::class, 'exportVotes']);
        Route::get('/admin/reports/revenue', [ReportController::class, 'revenue']);
        Route::get('/admin/reports/revenue/export', [ReportController::class, 'exportRevenue']);
    });

    Route::middleware('permission:users.suspend')->group(function () {
        Route::post('/admin/users/{user}/suspend', [AdminUserController::class, 'suspend']);
        Route::post('/admin/users/{user}/activate', [AdminUserController::class, 'activate']);
    });
    Route::middleware('permission:roles.manage')->group(function () {
        Route::post('/admin/users', [AdminUserController::class, 'invite']);
        Route::put('/admin/users/{user}', [AdminUserController::class, 'update']);
        Route::post('/admin/users/{user}/role', [AdminUserController::class, 'setRole']);
        Route::post('/admin/users/{user}/permissions', [AdminUserController::class, 'setPermissions']);
        Route::post('/admin/users/{user}/roles', [AdminUserController::class, 'setRoles']);
        Route::post('/admin/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);
        Route::post('/admin/users/{user}/archive', [AdminUserController::class, 'archive']);
        Route::post('/admin/users/{user}/unarchive', [AdminUserController::class, 'unarchive']);
        Route::post('/admin/users/{user}/dismiss-deletion-request', [AdminUserController::class, 'dismissDeletionRequest']);

        Route::get('/admin/roles', [RoleController::class, 'index']);
        Route::post('/admin/roles', [RoleController::class, 'store']);
        Route::put('/admin/roles/{role}', [RoleController::class, 'update']);
        Route::delete('/admin/roles/{role}', [RoleController::class, 'destroy']);
        Route::get('/admin/permissions', [PermissionController::class, 'index']);
    });

    Route::middleware('permission:fraud.review')->group(function () {
        Route::get('/admin/fraud', [FraudController::class, 'index']);
        Route::get('/admin/fraud/stats', [FraudController::class, 'stats']);
        Route::get('/admin/votes/map', [VoteMapController::class, 'index']);
    });
    Route::middleware('permission:fraud.resolve')->group(function () {
        Route::post('/admin/fraud/{fraud}/clear', [FraudController::class, 'clear']);
        Route::post('/admin/fraud/{fraud}/invalidate', [FraudController::class, 'invalidate']);
        Route::post('/admin/fraud/{fraud}/cancel', [FraudController::class, 'cancel']);
    });

    Route::middleware('permission:settings.edit')->group(function () {
        Route::get('/admin/settings', [AdminSettingsController::class, 'show']);
        Route::put('/admin/settings', [AdminSettingsController::class, 'update']);
    });

    Route::middleware('permission:sms.manage')->group(function () {
        Route::get('/admin/sms-credentials', [SmsCredentialController::class, 'index']);
        Route::post('/admin/sms-credentials', [SmsCredentialController::class, 'store']);
        Route::put('/admin/sms-credentials/{smsCredential}', [SmsCredentialController::class, 'update']);
        Route::delete('/admin/sms-credentials/{smsCredential}', [SmsCredentialController::class, 'destroy']);
        Route::post('/admin/sms-credentials/{smsCredential}/activate', [SmsCredentialController::class, 'activate']);
        Route::post('/admin/sms-credentials/{smsCredential}/deactivate', [SmsCredentialController::class, 'deactivate']);
    });
});
