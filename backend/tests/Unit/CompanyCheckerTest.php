<?php

namespace Tests\Unit;

use App\Services\CompanyChecker;
use PHPUnit\Framework\TestCase;

class CompanyCheckerTest extends TestCase
{
    /** A checker whose registry answers are supplied by the test (no network). */
    private function checkerWith(array $answers): CompanyChecker
    {
        return new class($answers) extends CompanyChecker
        {
            public function __construct(private array $answers) {}

            protected function lookupDomain(string $domain): array
            {
                return $this->answers[$domain] ?? ['age_days' => null, 'exists' => true];
            }
        };
    }

    public function test_extracts_company_domains_and_skips_job_boards_and_free_mail(): void
    {
        $text = 'Apply at www.acme-corp.com or email careers@acme-corp.com. Also see https://ph.indeed.com/viewjob and facebook.com/acme, or mail me@gmail.com. Branch: https://hr.northwind.com.ph/jobs';

        $domains = (new CompanyChecker)->extractDomains($text);

        $this->assertSame(['acme-corp.com', 'northwind.com.ph'], $domains);
    }

    public function test_ignores_reserved_and_non_domains(): void
    {
        $domains = (new CompanyChecker)->extractDomains('Contact hr@initech.example. Version 3.5 pay e.g. 500. www.localhost');

        $this->assertSame([], $domains);
    }

    public function test_a_brand_new_domain_is_a_high_severity_flag(): void
    {
        $checker = $this->checkerWith(['fastjobs-ph.com' => ['age_days' => 9, 'exists' => true]]);

        $result = $checker->check('Email hr@fastjobs-ph.com to apply.');

        $this->assertCount(1, $result['flags']);
        $this->assertSame('high', $result['flags'][0]['severity']);
        $this->assertSame('fastjobs-ph.com (9 d)', $result['flags'][0]['evidence']);
        $this->assertSame(9, $result['domains'][0]['age_days']);
    }

    public function test_a_domain_a_few_months_old_is_a_medium_flag(): void
    {
        $checker = $this->checkerWith(['newco.com' => ['age_days' => 100, 'exists' => true]]);

        $this->assertSame('medium', $checker->check('Visit www.newco.com')['flags'][0]['severity']);
    }

    public function test_a_missing_domain_is_flagged(): void
    {
        $checker = $this->checkerWith(['ghost-company.com' => ['age_days' => null, 'exists' => false]]);

        $flags = $checker->check('Email jobs@ghost-company.com')['flags'];

        $this->assertCount(1, $flags);
        $this->assertSame('ghost-company.com', $flags[0]['evidence']);
    }

    public function test_a_registry_miss_alone_does_not_mean_the_domain_is_missing(): void
    {
        // Registry has no record (e.g. .ph) but DNS works: a real company.
        $this->assertTrue(CompanyChecker::domainExists(false, true));
        // Registry has no record and DNS has nothing: genuinely missing.
        $this->assertFalse(CompanyChecker::domainExists(false, false));
        // Registry unreachable and no DNS answer: unknown, so do not accuse.
        $this->assertTrue(CompanyChecker::domainExists(null, false));
        $this->assertTrue(CompanyChecker::domainExists(true, false));
    }

    public function test_an_old_domain_is_a_good_sign_not_a_flag(): void
    {
        $checker = $this->checkerWith(['oldcorp.com' => ['age_days' => 3000, 'exists' => true]]);

        $result = $checker->check('Visit https://oldcorp.com/careers');

        $this->assertSame([], $result['flags']);
        $this->assertStringContainsString('8+ years', $result['positives'][0]['en']);
    }
}
