<?php

namespace Tests\Unit;

use App\Services\ScamAnalyzer;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ScamAnalyzerTest extends TestCase
{
    /** @return array<string, array{string}> */
    public static function scamPosts(): array
    {
        return [
            'registration fee + telegram' => [
                'URGENT HIRING! Work from home, earn $300 per day, no experience needed. Pay a registration fee of 500 pesos for your starter kit. Contact us on Telegram @easyjobs only. Hired immediately, no interview.',
            ],
            'task scam' => [
                'Part-time online job! Complete simple tasks like liking YouTube videos and rating products. Earn 3000 pesos daily commission per task. Message our HR on WhatsApp +63 900 000 0000. Unlock more tasks as you go.',
            ],
            'fake cheque' => [
                'Virtual assistant needed. We will send you a check to buy your equipment from our vendor. Deposit the check and then reply with your bank details. Salary $900 per week, no experience required.',
            ],
            'facebook bait' => [
                'HIRING!!! WORK FROM HOME!!! NO EXPERIENCE NEEDED!!! EARN PHP 2000 DAILY!!! COMMENT INTERESTED OR PM ME FOR DETAILS!!! LIMITED SLOTS ONLY!!!',
            ],
        ];
    }

    /** @return array<string, array{string}> */
    public static function legitPosts(): array
    {
        return [
            'junior developer' => [
                'Acme Software Inc. is hiring a Junior Web Developer in Makati City. Responsibilities: build and maintain React features. Requirements: 1 year of React experience and good communication skills. Benefits include SSS, PhilHealth, Pag-IBIG and HMO. Send your CV to careers@acme.example and we will schedule a technical interview.',
            ],
            'customer support' => [
                'Northwind Solutions Corp is looking for customer support agents at our Cebu City office. You will answer customer emails and calls. Qualifications: college undergraduate, strong English, 6 months of experience preferred. Salary PHP 22000 per month with 13th month pay. Apply at www.northwind.example/careers. Initial interview and final interview are required.',
            ],
        ];
    }

    #[DataProvider('scamPosts')]
    public function test_scam_posts_are_high_risk(string $post): void
    {
        $result = (new ScamAnalyzer)->analyze($post);

        $this->assertSame('high', $result['level'], 'Score was '.$result['score']);
    }

    #[DataProvider('legitPosts')]
    public function test_legit_posts_are_low_risk(string $post): void
    {
        $result = (new ScamAnalyzer)->analyze($post);

        $this->assertSame('low', $result['level'], 'Score was '.$result['score']);
        $this->assertNotEmpty($result['positives']);
    }

    public function test_negated_fee_is_not_flagged(): void
    {
        $post = 'Globex Corporation hires data analysts in Taguig City. Responsibilities include reporting. Requirements: SQL skills. We never charge any registration fee and there is no fee to apply. Email hr@globex.example for an interview.';

        $titles = array_column((new ScamAnalyzer)->analyze($post)['flags'], 'title');

        $this->assertNotContains('Asks you to pay money to get the job', $titles);
    }

    public function test_flags_include_the_triggering_words(): void
    {
        $result = (new ScamAnalyzer)->analyze('Pay a registration fee today to start. Contact us on Telegram.');

        $fee = collect($result['flags'])->firstWhere('title', 'Asks you to pay money to get the job');

        $this->assertNotNull($fee);
        $this->assertSame('registration fee', $fee['evidence']);
        $this->assertSame('high', $fee['severity']);
    }

    public function test_a_single_critical_flag_forces_high_risk(): void
    {
        $result = (new ScamAnalyzer)->analyze('Initech Inc. needs a clerk in Manila. Responsibilities and requirements are listed. Applicants must pay a training fee. Email hr@initech.example.');

        $this->assertSame('high', $result['level']);
    }

    public function test_taglish_scam_post_is_high_risk(): void
    {
        $post = 'HIRING! Walang experience kailangan, kumita ng malaking sahod araw-araw. Mag-bayad muna ng registration para sa starter kit. Mag-message kami sa Telegram. Limitado ang slots, mag-apply na ngayon!';

        $result = (new ScamAnalyzer)->analyze($post);

        $this->assertSame('high', $result['level'], 'Score was '.$result['score']);
    }

    public function test_taglish_pay_per_day_is_flagged(): void
    {
        $result = (new ScamAnalyzer)->analyze('Walang experience kailangan. Sahod ₱3000 kada araw, simpleng trabaho lang sa bahay para sa lahat ng gustong kumita.');

        $titles = array_column($result['flags'], 'title');

        $this->assertContains('Pay is far above normal for the work', $titles);
    }

    public function test_taglish_negation_is_not_flagged(): void
    {
        $post = 'Initech Inc. sa Makati ay naghahanap ng clerk. Tungkulin: mag-encode ng records. Requirements: college graduate. Walang bayad ang pag-apply at hindi kami humihingi ng registration fee. Mag-email sa hr@initech.example para sa interview.';

        $titles = array_column((new ScamAnalyzer)->analyze($post)['flags'], 'title');

        $this->assertNotContains('Asks you to pay money to get the job', $titles);
    }

    public function test_every_flag_has_a_tagalog_version(): void
    {
        $result = (new ScamAnalyzer)->analyze('Pay a registration fee and contact us on Telegram. Easy money, guaranteed income!');

        foreach ($result['flags'] as $flag) {
            $this->assertNotEmpty($flag['tl']['title']);
            $this->assertNotEmpty($flag['tl']['detail']);
        }
    }
}
